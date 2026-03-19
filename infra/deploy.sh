#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
DEFAULT_PROD_ENV_FILE="$ROOT_DIR/.env.local"

GH_SECRET_KEYS=()
GH_SECRET_VALUES=()

SCRIPT_STARTED_AT_EPOCH="$(date +%s)"
PROGRESS_TOTAL=0
PROGRESS_CURRENT=0

log_with_level() {
  local level="$1"
  shift

  printf '[%s] [%s] %s\n' "$(date +"%H:%M:%S")" "$level" "$*"
}

log_info() {
  log_with_level INFO "$*"
}

log_success() {
  log_with_level OK "$*"
}

log_warn() {
  log_with_level WARN "$*"
}

log_error() {
  log_with_level ERROR "$*" >&2
}

progress_start() {
  PROGRESS_TOTAL="$1"
  PROGRESS_CURRENT=0
}

progress_step() {
  local label="$1"

  PROGRESS_CURRENT=$((PROGRESS_CURRENT + 1))
  if [[ "$PROGRESS_TOTAL" -gt 0 ]]; then
    log_info "Progress ${PROGRESS_CURRENT}/${PROGRESS_TOTAL}: ${label}"
  else
    log_info "$label"
  fi
}

run_duration_seconds() {
  printf '%s' "$(( $(date +%s) - SCRIPT_STARTED_AT_EPOCH ))"
}

configure_progress_for_command() {
  local total

  if [[ "$COMMAND" == "validate" ]]; then
    total=3
  else
    total=4

    if [[ "$SYNC_ENV" == "true" || "$SYNC_GH" == "true" ]]; then
      total=$((total + 1))
    fi

    if [[ "$SYNC_ENV" == "true" ]]; then
      total=$((total + 1))
    fi

    if [[ "$SYNC_GH" == "true" ]]; then
      total=$((total + 1))
    fi
  fi

  progress_start "$total"
}

usage() {
  cat <<'EOF'
Usage:
  infra/deploy.sh <validate|deploy> --params <file> [options]

Options:
  --subscription <id-or-name>     Azure subscription to use for this run
  --location <azure-region>       Subscription deployment location override
  --create-rg                     Create the resource group before deployment
  --env-file <path>               Local env file to update (default: .env.local)
  --repo <owner/name>             GitHub repo to update secrets for (auto-detected by default)
  --azure-client-id <id>          Azure AD app/client ID for GitHub OIDC secret
  --no-sync-env                   Skip local env file updates after deploy
  --no-sync-gh                    Skip GitHub secret updates after deploy

Examples:
  infra/deploy.sh validate --subscription "Azure subscription 1" --params infra/main.prod.bicepparam
  infra/deploy.sh deploy --subscription 00000000-0000-0000-0000-000000000000 --params infra/main.prod.bicepparam --create-rg
  infra/deploy.sh deploy --params infra/main.prod.bicepparam --repo factnsoftware/cv-collector --azure-client-id 00000000-0000-0000-0000-000000000000
EOF
}

read_bicepparam_string() {
  local name="$1"
  local file="$2"

  sed -n -E "s/^[[:space:]]*param[[:space:]]+${name}[[:space:]]*=[[:space:]]*'([^']*)'.*$/\1/p" "$file" | head -n1
}

read_bicepparam_bool() {
  local name="$1"
  local file="$2"

  sed -n -E "s/^[[:space:]]*param[[:space:]]+${name}[[:space:]]*=[[:space:]]*(true|false).*$/\1/p" "$file" | head -n1
}

get_env_value() {
  local file="$1"
  local key="$2"
  local raw

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  raw="$(grep -E "^${key}=" "$file" | tail -n1 | cut -d'=' -f2- || true)"
  if [[ -z "$raw" ]]; then
    return 0
  fi

  if [[ "$raw" == \"*\" ]]; then
    raw="${raw#\"}"
    raw="${raw%\"}"
  elif [[ "$raw" == \'*\' ]]; then
    raw="${raw#\'}"
    raw="${raw%\'}"
  fi

  printf '%s' "$raw"
}

dotenv_escape() {
  local value="$1"

  printf '%s' "$value" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\$/\\$/g' -e 's/`/\\`/g'
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local line
  local tmp_file

  line="${key}=\"$(dotenv_escape "$value")\""
  tmp_file="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v key="$key" -v line="$line" '
      BEGIN { replaced = 0 }
      $0 ~ "^" key "=" {
        if (!replaced) {
          print line
          replaced = 1
        }
        next
      }
      { print }
      END {
        if (!replaced) {
          print line
        }
      }
    ' "$file" > "$tmp_file"
  else
    printf '%s\n' "$line" > "$tmp_file"
  fi

  mv "$tmp_file" "$file"
}

get_env_comment_value() {
  local file="$1"
  local key="$2"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  sed -n -E "s/^#[[:space:]]*${key}=(.*)$/\1/p" "$file" | tail -n1
}

upsert_env_comment() {
  local file="$1"
  local key="$2"
  local value="$3"
  local line
  local tmp_file

  line="# ${key}=${value}"
  tmp_file="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v key="$key" -v line="$line" '
      BEGIN { replaced = 0 }
      $0 ~ "^# " key "=" {
        if (!replaced) {
          print line
          replaced = 1
        }
        next
      }
      { print }
      END {
        if (!replaced) {
          print line
        }
      }
    ' "$file" > "$tmp_file"
  else
    printf '%s\n' "$line" > "$tmp_file"
  fi

  mv "$tmp_file" "$file"
}

retry_until_nonempty() {
  local description="$1"
  local attempts="$2"
  shift 2
  local value=""
  local i

  for ((i = 1; i <= attempts; i++)); do
    if value="$($@ 2>/dev/null)" && [[ -n "$value" && "$value" != "null" ]]; then
      printf '%s' "$value"
      return 0
    fi

    if [[ "$i" -lt "$attempts" ]]; then
      log_warn "Waiting for ${description} (${i}/${attempts})..."
      sleep 5
    fi
  done

  log_error "Failed to resolve ${description} after ${attempts} attempts."
  return 1
}

detect_github_repo() {
  local repo
  local origin

  if command -v gh >/dev/null 2>&1; then
    repo="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
    if [[ -n "$repo" ]]; then
      printf '%s' "$repo"
      return 0
    fi
  fi

  origin="$(git -C "$ROOT_DIR" config --get remote.origin.url 2>/dev/null || true)"
  if [[ "$origin" =~ github\.com[:/]([^/]+/[^/.]+)(\.git)?$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

set_github_secret_if_present() {
  local key="$1"
  local value="$2"
  local repo="$3"

  if [[ -z "$value" ]]; then
    log_warn "Skipping GitHub secret ${key}: value is empty."
    return 0
  fi

  gh secret set "$key" --repo "$repo" --body "$value" >/dev/null
  log_success "Updated GitHub repository secret: ${key}"
}

sync_github_repo_secrets() {
  local repo="$1"
  local i
  local key
  local value
  local total

  total="${#GH_SECRET_KEYS[@]}"

  log_info "Updating GitHub repository secrets in repository: $repo"

  for i in "${!GH_SECRET_KEYS[@]}"; do
    key="${GH_SECRET_KEYS[$i]}"
    value="${GH_SECRET_VALUES[$i]}"
    log_info "Processing GitHub secret $((i + 1))/${total}: ${key}"
    set_github_secret_if_present "$key" "$value" "$repo"
  done
}

generate_random_token() {
  local byte_count="$1"

  openssl rand -base64 "$byte_count" | tr -d '\n' | tr '+/' '-_' | cut -c1-64
}

iso_utc_plus_one_year() {
  if date -u -v+365d +"%Y-%m-%dT%H:%M:%SZ" >/dev/null 2>&1; then
    date -u -v+365d +"%Y-%m-%dT%H:%M:%SZ"
  else
    date -u -d "+365 days" +"%Y-%m-%dT%H:%M:%SZ"
  fi
}

iso_now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

sha256_string() {
  local input="$1"

  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$input" | shasum -a 256 | awk '{print $1}'
    return 0
  fi

  if command -v openssl >/dev/null 2>&1; then
    printf '%s' "$input" | openssl dgst -sha256 | awk '{print $2}'
    return 0
  fi

  echo "Neither shasum nor openssl is available to calculate SHA-256." >&2
  return 1
}

env_has_required_values() {
  local file="$1"
  shift
  local key

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  for key in "$@"; do
    if [[ -z "$(get_env_value "$file" "$key")" ]]; then
      return 1
    fi
  done

  return 0
}

env_key_matches_expected() {
  local file="$1"
  local key="$2"
  local expected="$3"
  local actual

  actual="$(get_env_value "$file" "$key")"
  [[ "$actual" == "$expected" ]]
}

normalize_utc_timestamp() {
  local timestamp="$1"

  if [[ -z "$timestamp" || "$timestamp" == "null" ]]; then
    return 0
  fi

  printf '%s' "$timestamp" \
    | sed -E 's/\.[0-9]+//; s/\+00:00$/Z/; s/\+0000$/Z/'
}

deployment_timestamp_utc() {
  local deployment_name="$1"
  local raw_timestamp

  raw_timestamp="$(az deployment sub show --name "$deployment_name" --query properties.timestamp -o tsv 2>/dev/null || true)"
  normalize_utc_timestamp "$raw_timestamp"
}

latest_stack_resource_timestamp_utc() {
  local resource_group_name="$1"
  local app_name="$2"
  local raw_timestamp

  raw_timestamp="$(az resource list \
    --resource-group "$resource_group_name" \
    --query "sort_by([?tags.app=='${app_name}' && systemData.lastModifiedAt!=null], &systemData.lastModifiedAt)[-1].systemData.lastModifiedAt" \
    -o tsv 2>/dev/null || true)"

  if [[ -z "$raw_timestamp" || "$raw_timestamp" == "null" ]]; then
    raw_timestamp="$(az resource list \
      --resource-group "$resource_group_name" \
      --query "sort_by([?tags.app=='${app_name}' && systemData.createdAt!=null], &systemData.createdAt)[-1].systemData.createdAt" \
      -o tsv 2>/dev/null || true)"
  fi

  normalize_utc_timestamp "$raw_timestamp"
}

find_resource_name_in_group() {
  local resource_group_name="$1"
  local resource_type="$2"
  local app_name="$3"
  local resource_name

  resource_name="$(az resource list \
    --resource-group "$resource_group_name" \
    --resource-type "$resource_type" \
    --query "[?tags.app=='${app_name}'] | [0].name" \
    -o tsv 2>/dev/null || true)"

  if [[ -z "$resource_name" || "$resource_name" == "null" ]]; then
    resource_name="$(az resource list \
      --resource-group "$resource_group_name" \
      --resource-type "$resource_type" \
      --query "[0].name" \
      -o tsv 2>/dev/null || true)"
  fi

  if [[ "$resource_name" == "null" ]]; then
    resource_name=""
  fi

  printf '%s' "$resource_name"
}

stack_resources_available_in_group() {
  local resource_group_name="$1"
  local app_name="$2"
  local storage_account_name
  local registry_name
  local communication_service_name
  local group_exists

  group_exists="$(az group exists --name "$resource_group_name" -o tsv 2>/dev/null || echo "false")"
  if [[ "$group_exists" != "true" ]]; then
    return 1
  fi

  storage_account_name="$(find_resource_name_in_group "$resource_group_name" "Microsoft.Storage/storageAccounts" "$app_name")"
  registry_name="$(find_resource_name_in_group "$resource_group_name" "Microsoft.ContainerRegistry/registries" "$app_name")"
  communication_service_name="$(find_resource_name_in_group "$resource_group_name" "Microsoft.Communication/communicationServices" "$app_name")"

  if [[ -z "$storage_account_name" || -z "$registry_name" || -z "$communication_service_name" ]]; then
    return 1
  fi

  az storage account show --name "$storage_account_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1
  az acr show --name "$registry_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1
  az communication show --name "$communication_service_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1

  return 0
}

resolve_stack_values_from_resource_group() {
  local resource_group_name="$1"
  local app_name="$2"

  STORAGE_ACCOUNT_NAME="$(find_resource_name_in_group "$resource_group_name" "Microsoft.Storage/storageAccounts" "$app_name")"
  REGISTRY_NAME="$(find_resource_name_in_group "$resource_group_name" "Microsoft.ContainerRegistry/registries" "$app_name")"
  COMMUNICATION_SERVICE_NAME="$(find_resource_name_in_group "$resource_group_name" "Microsoft.Communication/communicationServices" "$app_name")"

  if [[ -z "$STORAGE_ACCOUNT_NAME" || -z "$REGISTRY_NAME" || -z "$COMMUNICATION_SERVICE_NAME" ]]; then
    return 1
  fi

  REGISTRY_LOGIN_SERVER="$(retry_until_nonempty "registry login server" 10 az acr show --name "$REGISTRY_NAME" --resource-group "$resource_group_name" --query loginServer -o tsv)"

  return 0
}

find_latest_stack_deployment() {
  local resource_group_name="$1"
  local app_name="$2"

  az deployment sub list \
    --query "sort_by([?properties.provisioningState=='Succeeded' && properties.parameters.resourceGroupName.value=='${resource_group_name}' && properties.parameters.appName.value=='${app_name}'], &properties.timestamp)[-1].name" \
    -o tsv 2>/dev/null || true
}

stack_resources_available() {
  local deployment_name="$1"
  local resource_group_name="$2"
  local storage_account_name
  local registry_login_server
  local communication_service_name
  local registry_name
  local group_exists

  group_exists="$(az group exists --name "$resource_group_name" -o tsv 2>/dev/null || echo "false")"
  if [[ "$group_exists" != "true" ]]; then
    return 1
  fi

  storage_account_name="$(az deployment sub show --name "$deployment_name" --query properties.outputs.storageAccountName.value -o tsv 2>/dev/null || true)"
  registry_login_server="$(az deployment sub show --name "$deployment_name" --query properties.outputs.registryLoginServer.value -o tsv 2>/dev/null || true)"
  communication_service_name="$(az deployment sub show --name "$deployment_name" --query properties.outputs.communicationServiceName.value -o tsv 2>/dev/null || true)"

  if [[ -z "$storage_account_name" || "$storage_account_name" == "null" ]]; then
    return 1
  fi

  if [[ -z "$registry_login_server" || "$registry_login_server" == "null" ]]; then
    return 1
  fi

  if [[ -z "$communication_service_name" || "$communication_service_name" == "null" ]]; then
    return 1
  fi

  registry_name="${registry_login_server%%.*}"

  az storage account show --name "$storage_account_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1
  az acr show --name "$registry_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1
  az communication show --name "$communication_service_name" --resource-group "$resource_group_name" --query name -o tsv >/dev/null 2>&1 || return 1

  return 0
}

github_repo_secrets_are_current() {
  local repo="$1"
  local reference_timestamp="$2"
  local i
  local key
  local value
  local updated_at

  if [[ -z "$reference_timestamp" ]]; then
    return 1
  fi

  for i in "${!GH_SECRET_KEYS[@]}"; do
    key="${GH_SECRET_KEYS[$i]}"
    value="${GH_SECRET_VALUES[$i]}"

    if [[ -z "$value" ]]; then
      continue
    fi

    updated_at="$(gh api "/repos/${repo}/actions/secrets/${key}" --jq '.updated_at[:19] + "Z"' 2>/dev/null || true)"
    if [[ -z "$updated_at" || "$updated_at" == "null" ]]; then
      return 1
    fi

    if [[ "$updated_at" < "$reference_timestamp" ]]; then
      return 1
    fi
  done

  return 0
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

COMMAND="$1"
shift

PARAMS_FILE=""
SUBSCRIPTION=""
DEPLOY_LOCATION=""
CREATE_RG="false"
ENV_FILE=""
SYNC_ENV="true"
SYNC_GH="true"
GH_REPO=""
AZURE_CLIENT_ID_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --params)
      PARAMS_FILE="$2"
      shift 2
      ;;
    --subscription)
      SUBSCRIPTION="$2"
      shift 2
      ;;
    --location)
      DEPLOY_LOCATION="$2"
      shift 2
      ;;
    --create-rg)
      CREATE_RG="true"
      shift
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --repo)
      GH_REPO="$2"
      shift 2
      ;;
    --azure-client-id)
      AZURE_CLIENT_ID_OVERRIDE="$2"
      shift 2
      ;;
    --no-sync-env)
      SYNC_ENV="false"
      shift
      ;;
    --no-sync-gh)
      SYNC_GH="false"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$COMMAND" != "validate" && "$COMMAND" != "deploy" ]]; then
  echo "Command must be 'validate' or 'deploy'." >&2
  usage
  exit 1
fi

if [[ "$COMMAND" == "validate" ]]; then
  SYNC_ENV="false"
  SYNC_GH="false"
fi

configure_progress_for_command

if [[ -z "$PARAMS_FILE" ]]; then
  echo "--params is required." >&2
  usage
  exit 1
fi

if [[ ! -f "$ROOT_DIR/$PARAMS_FILE" && ! -f "$PARAMS_FILE" ]]; then
  echo "Parameter file not found: $PARAMS_FILE" >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/$PARAMS_FILE" ]]; then
  PARAMS_PATH="$ROOT_DIR/$PARAMS_FILE"
else
  PARAMS_PATH="$PARAMS_FILE"
fi

PARAMS_ARG="@$PARAMS_PATH"
if [[ "$PARAMS_PATH" == *.bicepparam || "$PARAMS_PATH" == *.BICEPPARAM ]]; then
  # Azure CLI expects .bicepparam files without the @file syntax.
  PARAMS_ARG="$PARAMS_PATH"
fi

if [[ "$PARAMS_PATH" != *.bicepparam && "$PARAMS_PATH" != *.BICEPPARAM ]]; then
  echo "This script expects a .bicepparam file so it can auto-sync env and GitHub secrets." >&2
  exit 1
fi

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$DEFAULT_PROD_ENV_FILE"
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required." >&2
  exit 1
fi

az account show >/dev/null 2>&1 || {
  echo "Azure CLI is not logged in. Run 'az login' first." >&2
  exit 1
}

if [[ -n "$SUBSCRIPTION" ]]; then
  az account set --subscription "$SUBSCRIPTION"
fi

ACTIVE_SUBSCRIPTION="$(az account show --query name -o tsv)"
ACTIVE_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
ACTIVE_TENANT_ID="$(az account show --query tenantId -o tsv)"

RESOURCE_GROUP_NAME="$(read_bicepparam_string resourceGroupName "$PARAMS_PATH")"
LOCATION_FROM_PARAMS="$(read_bicepparam_string location "$PARAMS_PATH")"
APP_NAME="$(read_bicepparam_string appName "$PARAMS_PATH")"
EMAIL_SENDER_FROM_PARAMS="$(read_bicepparam_string emailSenderAddress "$PARAMS_PATH")"
AUTH_SECRET_FROM_PARAMS="$(read_bicepparam_string authSecret "$PARAMS_PATH")"
DEPLOY_CONTAINER_APP="$(read_bicepparam_bool deployContainerApp "$PARAMS_PATH")"

if [[ -z "$RESOURCE_GROUP_NAME" ]]; then
  echo "Could not read 'resourceGroupName' from $PARAMS_PATH" >&2
  exit 1
fi

if [[ -z "$APP_NAME" ]]; then
  echo "Could not read 'appName' from $PARAMS_PATH" >&2
  exit 1
fi

LOCATION="${DEPLOY_LOCATION:-$LOCATION_FROM_PARAMS}"

if [[ -z "$LOCATION" ]]; then
  echo "Could not determine deployment location. Pass --location or set param location in the bicepparam file." >&2
  exit 1
fi

progress_step "Resolved deployment context"
log_info "Using subscription: $ACTIVE_SUBSCRIPTION ($ACTIVE_SUBSCRIPTION_ID)"
log_info "Using resource group: $RESOURCE_GROUP_NAME"
log_info "Using deployment location: $LOCATION"
log_info "Target environment: prod (main)"
log_info "Local env file: $ENV_FILE"

if [[ "$COMMAND" == "validate" ]]; then
  progress_step "Running template validation"
  DEPLOYMENT_NAME="${APP_NAME}-validate-$(date +%Y%m%d%H%M%S)"
  log_info "Validation deployment name: $DEPLOYMENT_NAME"
  az deployment sub validate \
    --name "$DEPLOYMENT_NAME" \
    --location "$LOCATION" \
    --template-file "$INFRA_DIR/main.bicep" \
    --parameters "$PARAMS_ARG"

  progress_step "Validation completed"
  log_success "Validation completed in $(run_duration_seconds)s."
  exit 0
fi

progress_step "Checking existing infrastructure availability"

LATEST_STACK_DEPLOYMENT="$(find_latest_stack_deployment "$RESOURCE_GROUP_NAME" "$APP_NAME")"
if [[ "$LATEST_STACK_DEPLOYMENT" == "null" ]]; then
  LATEST_STACK_DEPLOYMENT=""
fi

DEPLOYMENT_TO_USE=""
SKIPPED_DEPLOYMENT="false"

if [[ -n "$LATEST_STACK_DEPLOYMENT" ]] && stack_resources_available "$LATEST_STACK_DEPLOYMENT" "$RESOURCE_GROUP_NAME"; then
  DEPLOYMENT_TO_USE="$LATEST_STACK_DEPLOYMENT"
  SKIPPED_DEPLOYMENT="true"
  log_success "Resources are already available from deployment '$DEPLOYMENT_TO_USE'."
  log_info "Skipping infrastructure deployment and moving to credential validation/sync."
elif stack_resources_available_in_group "$RESOURCE_GROUP_NAME" "$APP_NAME"; then
  DEPLOYMENT_TO_USE="$LATEST_STACK_DEPLOYMENT"
  SKIPPED_DEPLOYMENT="true"
  log_success "Resources are already available in resource group '$RESOURCE_GROUP_NAME'."
  if [[ -n "$DEPLOYMENT_TO_USE" ]]; then
    log_info "Using latest deployment record '$DEPLOYMENT_TO_USE' for sync timestamp checks."
  fi
  log_info "Skipping infrastructure deployment and moving to credential validation/sync."
else
  DEPLOYMENT_TO_USE="${APP_NAME}-$(date +%Y%m%d%H%M%S)"
  log_info "Deployment name: $DEPLOYMENT_TO_USE"

  if [[ "$CREATE_RG" == "true" ]]; then
    log_info "Ensuring resource group exists before deployment: $RESOURCE_GROUP_NAME"
    az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" >/dev/null
    log_success "Resource group ready: $RESOURCE_GROUP_NAME"
  fi

  az deployment sub create \
    --name "$DEPLOYMENT_TO_USE" \
    --location "$LOCATION" \
    --template-file "$INFRA_DIR/main.bicep" \
    --parameters "$PARAMS_ARG"

  log_success "Infrastructure deployment completed: $DEPLOYMENT_TO_USE"
fi

progress_step "Infrastructure deployment phase completed"

if [[ "$SYNC_ENV" != "true" && "$SYNC_GH" != "true" ]]; then
  progress_step "Finalizing deployment run"
  log_info "Deploy completed. Skipping env and GitHub secret sync by request."
  log_success "Run completed in $(run_duration_seconds)s."
  exit 0
fi

progress_step "Resolving deployed resource values"
log_info "Resolving deployed resource values..."

STORAGE_ACCOUNT_NAME=""
REGISTRY_LOGIN_SERVER=""
COMMUNICATION_SERVICE_NAME=""
REGISTRY_NAME=""

if [[ -n "$DEPLOYMENT_TO_USE" ]]; then
  if STORAGE_ACCOUNT_NAME="$(retry_until_nonempty "storage account output" 10 az deployment sub show --name "$DEPLOYMENT_TO_USE" --query properties.outputs.storageAccountName.value -o tsv)" \
    && REGISTRY_LOGIN_SERVER="$(retry_until_nonempty "registry login server output" 10 az deployment sub show --name "$DEPLOYMENT_TO_USE" --query properties.outputs.registryLoginServer.value -o tsv)" \
    && COMMUNICATION_SERVICE_NAME="$(retry_until_nonempty "communication service output" 10 az deployment sub show --name "$DEPLOYMENT_TO_USE" --query properties.outputs.communicationServiceName.value -o tsv)"; then
    log_success "Resolved stack values from deployment outputs: $DEPLOYMENT_TO_USE"
  else
    log_warn "Could not resolve deployment outputs from '$DEPLOYMENT_TO_USE'. Falling back to resource-group discovery."
  fi
fi

if [[ -z "$STORAGE_ACCOUNT_NAME" || -z "$REGISTRY_LOGIN_SERVER" || -z "$COMMUNICATION_SERVICE_NAME" ]]; then
  if ! resolve_stack_values_from_resource_group "$RESOURCE_GROUP_NAME" "$APP_NAME"; then
    log_error "Could not resolve required resources in resource group '$RESOURCE_GROUP_NAME'."
    exit 1
  fi
  log_success "Resolved stack values from resource-group discovery."
fi

CONTAINER_APP_NAME=""
if [[ -n "$DEPLOYMENT_TO_USE" ]]; then
  CONTAINER_APP_NAME="$(az deployment sub show --name "$DEPLOYMENT_TO_USE" --query properties.outputs.containerAppName.value -o tsv 2>/dev/null || true)"
fi
if [[ -z "$CONTAINER_APP_NAME" || "$CONTAINER_APP_NAME" == "null" ]]; then
  CONTAINER_APP_NAME="ca-${APP_NAME}"
fi

CONTAINER_APP_ENVIRONMENT="cae-${APP_NAME}"
if [[ -z "$REGISTRY_NAME" ]]; then
  REGISTRY_NAME="${REGISTRY_LOGIN_SERVER%%.*}"
fi

SOURCE_DEPLOYMENT_TIMESTAMP=""
if [[ -n "$DEPLOYMENT_TO_USE" ]]; then
  SOURCE_DEPLOYMENT_TIMESTAMP="$(deployment_timestamp_utc "$DEPLOYMENT_TO_USE")"
fi

if [[ -z "$SOURCE_DEPLOYMENT_TIMESTAMP" ]]; then
  SOURCE_DEPLOYMENT_TIMESTAMP="$(latest_stack_resource_timestamp_utc "$RESOURCE_GROUP_NAME" "$APP_NAME")"
fi

if [[ -z "$SOURCE_DEPLOYMENT_TIMESTAMP" ]]; then
  SOURCE_DEPLOYMENT_TIMESTAMP="$(get_env_comment_value "$ENV_FILE" INFRA_SYNC_SOURCE_TIMESTAMP)"
fi

if [[ -z "$SOURCE_DEPLOYMENT_TIMESTAMP" ]]; then
  SOURCE_DEPLOYMENT_TIMESTAMP="$(iso_now_utc)"
fi

STORAGE_CONNECTION_STRING="$(retry_until_nonempty "storage connection string" 20 az storage account show-connection-string --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_NAME" --query connectionString -o tsv)"
COMMUNICATION_CONNECTION_STRING="$(retry_until_nonempty "communication connection string" 20 az communication list-key --name "$COMMUNICATION_SERVICE_NAME" --resource-group "$RESOURCE_GROUP_NAME" --query primaryConnectionString -o tsv)"

if [[ -f "$ENV_FILE" ]]; then
  EXISTING_AUTH_SECRET="$(get_env_value "$ENV_FILE" AUTH_SECRET)"
  EXISTING_ADMIN_PERMISSION_TOKEN="$(get_env_value "$ENV_FILE" ADMIN_PERMISSION_TOKEN)"
  EXISTING_ADMIN_PERMISSION_TOKEN_EXPIRES_AT="$(get_env_value "$ENV_FILE" ADMIN_PERMISSION_TOKEN_EXPIRES_AT)"
  EXISTING_OPENAI_API_KEY="$(get_env_value "$ENV_FILE" OPENAI_API_KEY)"
  EXISTING_ATS_OPENAI_MODEL="$(get_env_value "$ENV_FILE" ATS_OPENAI_MODEL)"
  EXISTING_AZURE_CLIENT_ID="$(get_env_value "$ENV_FILE" AZURE_CLIENT_ID)"
else
  EXISTING_AUTH_SECRET=""
  EXISTING_ADMIN_PERMISSION_TOKEN=""
  EXISTING_ADMIN_PERMISSION_TOKEN_EXPIRES_AT=""
  EXISTING_OPENAI_API_KEY=""
  EXISTING_ATS_OPENAI_MODEL=""
  EXISTING_AZURE_CLIENT_ID=""
fi

AUTH_SECRET_FINAL="$AUTH_SECRET_FROM_PARAMS"
if [[ -z "$AUTH_SECRET_FINAL" ]]; then
  AUTH_SECRET_FINAL="$EXISTING_AUTH_SECRET"
fi
if [[ -z "$AUTH_SECRET_FINAL" ]]; then
  AUTH_SECRET_FINAL="$(generate_random_token 64)"
  log_warn "Generated AUTH_SECRET because no value was provided in params or env file."
fi

EMAIL_SENDER_FINAL="$EMAIL_SENDER_FROM_PARAMS"
if [[ -z "$EMAIL_SENDER_FINAL" ]]; then
  EMAIL_SENDER_FINAL="$(get_env_value "$ENV_FILE" AZURE_EMAIL_SENDER_ADDRESS)"
fi

ADMIN_PERMISSION_TOKEN_FINAL="$EXISTING_ADMIN_PERMISSION_TOKEN"
if [[ -z "$ADMIN_PERMISSION_TOKEN_FINAL" ]]; then
  ADMIN_PERMISSION_TOKEN_FINAL="$(generate_random_token 48)"
  log_warn "Generated ADMIN_PERMISSION_TOKEN because no value was found in env file."
fi

ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL="$EXISTING_ADMIN_PERMISSION_TOKEN_EXPIRES_AT"
if [[ -z "$ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL" ]]; then
  ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL="$(iso_utc_plus_one_year)"
  log_warn "Generated ADMIN_PERMISSION_TOKEN_EXPIRES_AT because no value was found in env file."
fi

OPENAI_API_KEY_FINAL="$EXISTING_OPENAI_API_KEY"
ATS_OPENAI_MODEL_FINAL="$EXISTING_ATS_OPENAI_MODEL"
if [[ -z "$ATS_OPENAI_MODEL_FINAL" ]]; then
  ATS_OPENAI_MODEL_FINAL="gpt-4o-mini"
fi

AZURE_CLIENT_ID_FINAL="$AZURE_CLIENT_ID_OVERRIDE"
if [[ -z "$AZURE_CLIENT_ID_FINAL" ]]; then
  AZURE_CLIENT_ID_FINAL="${AZURE_CLIENT_ID:-}"
fi
if [[ -z "$AZURE_CLIENT_ID_FINAL" ]]; then
  AZURE_CLIENT_ID_FINAL="$EXISTING_AZURE_CLIENT_ID"
fi

SYNC_FINGERPRINT_PAYLOAD="$(cat <<EOF
AZURE_TENANT_ID=${ACTIVE_TENANT_ID}
AZURE_SUBSCRIPTION_ID=${ACTIVE_SUBSCRIPTION_ID}
AZURE_RESOURCE_GROUP=${RESOURCE_GROUP_NAME}
AZURE_CONTAINER_APP_NAME=${CONTAINER_APP_NAME}
AZURE_CONTAINERAPPS_ENVIRONMENT=${CONTAINER_APP_ENVIRONMENT}
AZURE_CONTAINERAPP_ENVIRONMENT=${CONTAINER_APP_ENVIRONMENT}
AZURE_CONTAINER_REGISTRY_NAME=${REGISTRY_NAME}
AZURE_CONTAINER_REGISTRY_LOGIN_SERVER=${REGISTRY_LOGIN_SERVER}
AZURE_STORAGE_ACCOUNT_NAME=${STORAGE_ACCOUNT_NAME}
AZURE_COMMUNICATION_SERVICE_NAME=${COMMUNICATION_SERVICE_NAME}
AZURE_STORAGE_CONNECTION_STRING=${STORAGE_CONNECTION_STRING}
AZURE_COMMUNICATION_CONNECTION_STRING=${COMMUNICATION_CONNECTION_STRING}
AZURE_BLOB_CONTAINER=cv-files
AZURE_TABLES_TABLE_NAME=cvcollector
AZURE_EMAIL_SENDER_ADDRESS=${EMAIL_SENDER_FINAL}
AUTH_SECRET=${AUTH_SECRET_FINAL}
ADMIN_PERMISSION_TOKEN=${ADMIN_PERMISSION_TOKEN_FINAL}
ADMIN_PERMISSION_TOKEN_EXPIRES_AT=${ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL}
OPENAI_API_KEY=${OPENAI_API_KEY_FINAL}
ATS_OPENAI_MODEL=${ATS_OPENAI_MODEL_FINAL}
AZURE_CLIENT_ID=${AZURE_CLIENT_ID_FINAL}
EOF
)"
SYNC_FINGERPRINT="$(sha256_string "$SYNC_FINGERPRINT_PAYLOAD")"

EXISTING_SYNC_SOURCE_TIMESTAMP="$(get_env_comment_value "$ENV_FILE" INFRA_SYNC_SOURCE_TIMESTAMP)"
EXISTING_SYNC_FINGERPRINT="$(get_env_comment_value "$ENV_FILE" INFRA_SYNC_FINGERPRINT)"
EXISTING_SYNC_LAST_UPDATED_AT="$(get_env_comment_value "$ENV_FILE" INFRA_SYNC_LAST_UPDATED_AT)"

REQUIRED_ENV_KEYS=(
  AZURE_STORAGE_CONNECTION_STRING
  AZURE_BLOB_CONTAINER
  AZURE_TABLES_TABLE_NAME
  AZURE_COMMUNICATION_CONNECTION_STRING
  AZURE_STORAGE_ACCOUNT_NAME
  AZURE_COMMUNICATION_SERVICE_NAME
  AZURE_RESOURCE_GROUP
  AZURE_CONTAINER_APP_NAME
  AZURE_CONTAINERAPPS_ENVIRONMENT
  AZURE_CONTAINER_REGISTRY_NAME
  AZURE_CONTAINER_REGISTRY_LOGIN_SERVER
  AZURE_SUBSCRIPTION_ID
  AZURE_TENANT_ID
  AUTH_SECRET
  ADMIN_PERMISSION_TOKEN
  ADMIN_PERMISSION_TOKEN_EXPIRES_AT
  ATS_OPENAI_MODEL
)

if [[ -n "$EMAIL_SENDER_FINAL" ]]; then
  REQUIRED_ENV_KEYS+=(AZURE_EMAIL_SENDER_ADDRESS)
fi

if [[ -n "$OPENAI_API_KEY_FINAL" ]]; then
  REQUIRED_ENV_KEYS+=(OPENAI_API_KEY)
fi

if [[ -n "$AZURE_CLIENT_ID_FINAL" ]]; then
  REQUIRED_ENV_KEYS+=(AZURE_CLIENT_ID)
fi

EXPECTED_ENV_KEYS=(
  AZURE_STORAGE_CONNECTION_STRING
  AZURE_BLOB_CONTAINER
  AZURE_TABLES_TABLE_NAME
  AZURE_COMMUNICATION_CONNECTION_STRING
  AZURE_STORAGE_ACCOUNT_NAME
  AZURE_COMMUNICATION_SERVICE_NAME
  AZURE_RESOURCE_GROUP
  AZURE_CONTAINER_APP_NAME
  AZURE_CONTAINERAPPS_ENVIRONMENT
  AZURE_CONTAINERAPP_ENVIRONMENT
  AZURE_CONTAINER_REGISTRY_NAME
  AZURE_CONTAINER_REGISTRY_LOGIN_SERVER
  AZURE_SUBSCRIPTION_ID
  AZURE_TENANT_ID
  AUTH_SECRET
  ADMIN_PERMISSION_TOKEN
  ADMIN_PERMISSION_TOKEN_EXPIRES_AT
  ATS_OPENAI_MODEL
)

EXPECTED_ENV_VALUES=(
  "$STORAGE_CONNECTION_STRING"
  "cv-files"
  "cvcollector"
  "$COMMUNICATION_CONNECTION_STRING"
  "$STORAGE_ACCOUNT_NAME"
  "$COMMUNICATION_SERVICE_NAME"
  "$RESOURCE_GROUP_NAME"
  "$CONTAINER_APP_NAME"
  "$CONTAINER_APP_ENVIRONMENT"
  "$CONTAINER_APP_ENVIRONMENT"
  "$REGISTRY_NAME"
  "$REGISTRY_LOGIN_SERVER"
  "$ACTIVE_SUBSCRIPTION_ID"
  "$ACTIVE_TENANT_ID"
  "$AUTH_SECRET_FINAL"
  "$ADMIN_PERMISSION_TOKEN_FINAL"
  "$ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL"
  "$ATS_OPENAI_MODEL_FINAL"
)

if [[ -n "$EMAIL_SENDER_FINAL" ]]; then
  EXPECTED_ENV_KEYS+=(AZURE_EMAIL_SENDER_ADDRESS)
  EXPECTED_ENV_VALUES+=("$EMAIL_SENDER_FINAL")
fi

if [[ -n "$OPENAI_API_KEY_FINAL" ]]; then
  EXPECTED_ENV_KEYS+=(OPENAI_API_KEY)
  EXPECTED_ENV_VALUES+=("$OPENAI_API_KEY_FINAL")
fi

if [[ -n "$AZURE_CLIENT_ID_FINAL" ]]; then
  EXPECTED_ENV_KEYS+=(AZURE_CLIENT_ID)
  EXPECTED_ENV_VALUES+=("$AZURE_CLIENT_ID_FINAL")
fi

ENV_HAS_REQUIRED_VALUES="false"
if env_has_required_values "$ENV_FILE" "${REQUIRED_ENV_KEYS[@]}"; then
  ENV_HAS_REQUIRED_VALUES="true"
fi

ENV_VALUES_MATCH_EXPECTED="false"
if [[ -f "$ENV_FILE" ]]; then
  ENV_VALUES_MATCH_EXPECTED="true"
  for i in "${!EXPECTED_ENV_KEYS[@]}"; do
    key="${EXPECTED_ENV_KEYS[$i]}"
    expected_value="${EXPECTED_ENV_VALUES[$i]}"

    if ! env_key_matches_expected "$ENV_FILE" "$key" "$expected_value"; then
      ENV_VALUES_MATCH_EXPECTED="false"
      break
    fi
  done
fi

RESOURCE_STATE_MATCH="false"
if [[ "$EXISTING_SYNC_SOURCE_TIMESTAMP" == "$SOURCE_DEPLOYMENT_TIMESTAMP" && "$EXISTING_SYNC_FINGERPRINT" == "$SYNC_FINGERPRINT" ]]; then
  RESOURCE_STATE_MATCH="true"
fi

LAST_UPDATED_COVERS_SOURCE="false"
if [[ -n "$EXISTING_SYNC_LAST_UPDATED_AT" ]]; then
  if [[ "$EXISTING_SYNC_LAST_UPDATED_AT" == "$SOURCE_DEPLOYMENT_TIMESTAMP" || "$EXISTING_SYNC_LAST_UPDATED_AT" > "$SOURCE_DEPLOYMENT_TIMESTAMP" ]]; then
    LAST_UPDATED_COVERS_SOURCE="true"
  fi
fi

ENV_IS_CURRENT="false"
if [[ "$ENV_HAS_REQUIRED_VALUES" == "true" && "$ENV_VALUES_MATCH_EXPECTED" == "true" && "$RESOURCE_STATE_MATCH" == "true" && "$LAST_UPDATED_COVERS_SOURCE" == "true" ]]; then
  ENV_IS_CURRENT="true"
fi

ENV_SYNC_REFERENCE_TIME="$EXISTING_SYNC_LAST_UPDATED_AT"

if [[ "$SYNC_ENV" == "true" ]]; then
  progress_step "Synchronizing local environment credentials"

  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
      cp "$ROOT_DIR/.env.example" "$ENV_FILE"
      log_info "Created env file from template: $ENV_FILE"
    else
      touch "$ENV_FILE"
      log_info "Created env file: $ENV_FILE"
    fi
  fi

  if [[ "$ENV_IS_CURRENT" == "true" ]]; then
    log_success "Local env credentials are already current for resource timestamp $SOURCE_DEPLOYMENT_TIMESTAMP. Skipping env update."
  else
    upsert_env_value "$ENV_FILE" AZURE_STORAGE_CONNECTION_STRING "$STORAGE_CONNECTION_STRING"
    upsert_env_value "$ENV_FILE" AZURE_BLOB_CONTAINER "cv-files"
    upsert_env_value "$ENV_FILE" AZURE_TABLES_TABLE_NAME "cvcollector"
    upsert_env_value "$ENV_FILE" AZURE_COMMUNICATION_CONNECTION_STRING "$COMMUNICATION_CONNECTION_STRING"
    upsert_env_value "$ENV_FILE" AZURE_STORAGE_ACCOUNT_NAME "$STORAGE_ACCOUNT_NAME"
    upsert_env_value "$ENV_FILE" AZURE_COMMUNICATION_SERVICE_NAME "$COMMUNICATION_SERVICE_NAME"
    upsert_env_value "$ENV_FILE" AZURE_RESOURCE_GROUP "$RESOURCE_GROUP_NAME"
    upsert_env_value "$ENV_FILE" AZURE_CONTAINER_APP_NAME "$CONTAINER_APP_NAME"
    upsert_env_value "$ENV_FILE" AZURE_CONTAINERAPPS_ENVIRONMENT "$CONTAINER_APP_ENVIRONMENT"
    upsert_env_value "$ENV_FILE" AZURE_CONTAINERAPP_ENVIRONMENT "$CONTAINER_APP_ENVIRONMENT"
    upsert_env_value "$ENV_FILE" AZURE_CONTAINER_REGISTRY_NAME "$REGISTRY_NAME"
    upsert_env_value "$ENV_FILE" AZURE_CONTAINER_REGISTRY_LOGIN_SERVER "$REGISTRY_LOGIN_SERVER"
    upsert_env_value "$ENV_FILE" AZURE_SUBSCRIPTION_ID "$ACTIVE_SUBSCRIPTION_ID"
    upsert_env_value "$ENV_FILE" AZURE_TENANT_ID "$ACTIVE_TENANT_ID"
    upsert_env_value "$ENV_FILE" AUTH_SECRET "$AUTH_SECRET_FINAL"
    upsert_env_value "$ENV_FILE" ADMIN_PERMISSION_TOKEN "$ADMIN_PERMISSION_TOKEN_FINAL"
    upsert_env_value "$ENV_FILE" ADMIN_PERMISSION_TOKEN_EXPIRES_AT "$ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL"
    upsert_env_value "$ENV_FILE" ATS_OPENAI_MODEL "$ATS_OPENAI_MODEL_FINAL"

    if [[ -n "$EMAIL_SENDER_FINAL" ]]; then
      upsert_env_value "$ENV_FILE" AZURE_EMAIL_SENDER_ADDRESS "$EMAIL_SENDER_FINAL"
    fi

    if [[ -n "$OPENAI_API_KEY_FINAL" ]]; then
      upsert_env_value "$ENV_FILE" OPENAI_API_KEY "$OPENAI_API_KEY_FINAL"
    fi

    if [[ -n "$AZURE_CLIENT_ID_FINAL" ]]; then
      upsert_env_value "$ENV_FILE" AZURE_CLIENT_ID "$AZURE_CLIENT_ID_FINAL"
    fi

    ENV_SYNC_REFERENCE_TIME="$(iso_now_utc)"
    upsert_env_comment "$ENV_FILE" INFRA_SYNC_LAST_UPDATED_AT "$ENV_SYNC_REFERENCE_TIME"
    upsert_env_comment "$ENV_FILE" INFRA_SYNC_SOURCE_TIMESTAMP "$SOURCE_DEPLOYMENT_TIMESTAMP"
    upsert_env_comment "$ENV_FILE" INFRA_SYNC_FINGERPRINT "$SYNC_FINGERPRINT"

    log_success "Updated local env file: $ENV_FILE"

    RESOURCE_STATE_MATCH="true"
    ENV_IS_CURRENT="true"
  fi
fi

if [[ "$SYNC_GH" == "true" ]]; then
  progress_step "Synchronizing GitHub repository secrets"

  if ! command -v gh >/dev/null 2>&1; then
    log_warn "GitHub CLI (gh) not found. Skipping GitHub secret sync."
  elif ! gh auth status >/dev/null 2>&1; then
    log_warn "GitHub CLI is not authenticated. Skipping GitHub secret sync."
  else
    if [[ -z "$GH_REPO" ]]; then
      GH_REPO="$(detect_github_repo)"
    fi

    if [[ -z "$GH_REPO" ]]; then
      log_warn "Could not determine GitHub repository for secret updates. Use --repo <owner/name>."
    else
      GH_SECRET_KEYS=(
        AZURE_TENANT_ID
        AZURE_SUBSCRIPTION_ID
        AZURE_RESOURCE_GROUP
        AZURE_CONTAINER_APP_NAME
        AZURE_CONTAINERAPPS_ENVIRONMENT
        AZURE_CONTAINERAPP_ENVIRONMENT
        AZURE_CONTAINER_REGISTRY_NAME
        AZURE_CONTAINER_REGISTRY_LOGIN_SERVER
        AZURE_STORAGE_ACCOUNT_NAME
        AZURE_COMMUNICATION_SERVICE_NAME
        AZURE_EMAIL_SENDER_ADDRESS
        AUTH_SECRET
        ADMIN_PERMISSION_TOKEN
        ADMIN_PERMISSION_TOKEN_EXPIRES_AT
        OPENAI_API_KEY
        ATS_OPENAI_MODEL
        AZURE_STORAGE_CONNECTION_STRING
        AZURE_COMMUNICATION_CONNECTION_STRING
        AZURE_BLOB_CONTAINER
        AZURE_TABLES_TABLE_NAME
        AZURE_CLIENT_ID
      )

      GH_SECRET_VALUES=(
        "$ACTIVE_TENANT_ID"
        "$ACTIVE_SUBSCRIPTION_ID"
        "$RESOURCE_GROUP_NAME"
        "$CONTAINER_APP_NAME"
        "$CONTAINER_APP_ENVIRONMENT"
        "$CONTAINER_APP_ENVIRONMENT"
        "$REGISTRY_NAME"
        "$REGISTRY_LOGIN_SERVER"
        "$STORAGE_ACCOUNT_NAME"
        "$COMMUNICATION_SERVICE_NAME"
        "$EMAIL_SENDER_FINAL"
        "$AUTH_SECRET_FINAL"
        "$ADMIN_PERMISSION_TOKEN_FINAL"
        "$ADMIN_PERMISSION_TOKEN_EXPIRES_AT_FINAL"
        "$OPENAI_API_KEY_FINAL"
        "$ATS_OPENAI_MODEL_FINAL"
        "$STORAGE_CONNECTION_STRING"
        "$COMMUNICATION_CONNECTION_STRING"
        "cv-files"
        "cvcollector"
        "$AZURE_CLIENT_ID_FINAL"
      )

      GH_REFERENCE_TIME="$SOURCE_DEPLOYMENT_TIMESTAMP"
      if [[ -n "$ENV_SYNC_REFERENCE_TIME" ]]; then
        if [[ "$ENV_SYNC_REFERENCE_TIME" == "$GH_REFERENCE_TIME" || "$ENV_SYNC_REFERENCE_TIME" > "$GH_REFERENCE_TIME" ]]; then
          GH_REFERENCE_TIME="$ENV_SYNC_REFERENCE_TIME"
        fi
      fi

      if [[ "$RESOURCE_STATE_MATCH" == "true" ]] && github_repo_secrets_are_current "$GH_REPO" "$GH_REFERENCE_TIME"; then
        log_success "GitHub repository secrets are already current for resource timestamp $GH_REFERENCE_TIME. Skipping GitHub update."
      else
        sync_github_repo_secrets "$GH_REPO"
      fi
    fi
  fi
fi

progress_step "Finalizing deployment run"
log_success "Deploy + sync complete in $(run_duration_seconds)s."
if [[ "$SKIPPED_DEPLOYMENT" == "true" ]]; then
  log_info "Infrastructure deployment was skipped because required resources already exist."
fi
log_info "Container app deployment enabled in params: ${DEPLOY_CONTAINER_APP:-false}"