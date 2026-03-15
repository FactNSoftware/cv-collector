#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

usage() {
  cat <<'EOF'
Usage:
  infra/deploy.sh <validate|deploy> --params <file> [options]

Options:
  --subscription <id-or-name>   Azure subscription to use for this run
  --location <azure-region>     Subscription deployment location override
  --create-rg                   Create the resource group before deployment

Examples:
  infra/deploy.sh validate --subscription "Azure subscription 1" --params infra/main.prod.bicepparam
  infra/deploy.sh deploy --subscription 00000000-0000-0000-0000-000000000000 --params infra/main.prod.bicepparam --create-rg
EOF
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

RESOURCE_GROUP_NAME="$(grep -E "^param resourceGroupName *= *'.*'$" "$PARAMS_PATH" | sed -E "s/^param resourceGroupName *= *'([^']+)'.*$/\1/")"
LOCATION_FROM_PARAMS="$(grep -E "^param location *= *'.*'$" "$PARAMS_PATH" | sed -E "s/^param location *= *'([^']+)'.*$/\1/")"

if [[ -z "$RESOURCE_GROUP_NAME" ]]; then
  echo "Could not read 'resourceGroupName' from $PARAMS_PATH" >&2
  exit 1
fi

LOCATION="${DEPLOY_LOCATION:-$LOCATION_FROM_PARAMS}"

if [[ -z "$LOCATION" ]]; then
  echo "Could not determine deployment location. Pass --location or set param location in the bicepparam file." >&2
  exit 1
fi

echo "Using subscription: $ACTIVE_SUBSCRIPTION ($ACTIVE_SUBSCRIPTION_ID)"
echo "Using resource group: $RESOURCE_GROUP_NAME"
echo "Using deployment location: $LOCATION"

if [[ "$CREATE_RG" == "true" ]]; then
  az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" >/dev/null
fi

if [[ "$COMMAND" == "validate" ]]; then
  az deployment sub validate \
    --location "$LOCATION" \
    --template-file "$INFRA_DIR/main.bicep" \
    --parameters "@$PARAMS_PATH"
else
  az deployment sub create \
    --location "$LOCATION" \
    --template-file "$INFRA_DIR/main.bicep" \
    --parameters "@$PARAMS_PATH"
fi
