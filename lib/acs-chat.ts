import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { ChatClient } from "@azure/communication-chat";
import { CommunicationIdentityClient } from "@azure/communication-identity";
import type { ChatMessage } from "@azure/communication-chat";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { isAdminEmail } from "./admin-access";
import { getCandidateProfileByEmail } from "./candidate-profile";
import {
  getCvSubmissionById,
  listCvSubmissionsByEmail,
  type CvSubmissionRecord,
} from "./cv-storage";

const CHAT_SCOPE = "chat";
const ACS_IDENTITY_TYPE = "acs_identity";
const APPLICATION_CHAT_TYPE = "application_chat";
const CHAT_READ_STATE_TYPE = "chat_read_state";
const CHAT_MESSAGE_MODERATION_TYPE = "chat_message_moderation";
const ACS_TOKEN_TTL_MINUTES = 60;

type AcsIdentityEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  appUserKey: string;
  acsUserId: string;
  createdAt: number;
  updatedAt: number;
};

type ApplicationChatEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  applicationId: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  candidateEmail: string;
  adminEmail: string;
  chatThreadId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  deletedBy?: string;
};

type ChatReadStateEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  applicationId: string;
  requesterKey: string;
  lastReadAt: number;
  createdAt: number;
  updatedAt: number;
};

type ChatMessageModerationEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  applicationId: string;
  messageId: string;
  deletedAt: number;
  deletedBy: string;
  createdAt: number;
  updatedAt: number;
};

export type AcsIdentityRecord = {
  appUserKey: string;
  acsUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationChatRecord = {
  applicationId: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  candidateEmail: string;
  adminEmail: string;
  chatThreadId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
};

export type ChatReadStateRecord = {
  applicationId: string;
  requesterKey: string;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageModerationRecord = {
  applicationId: string;
  messageId: string;
  deletedAt: string;
  deletedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatInboxItem = {
  applicationId: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  participantKey: string;
  participantLabel: string;
  participantSecondaryLabel: string;
  latestMessagePreview: string;
  latestMessageAt: string | null;
  unread: boolean;
  reviewStatus: CvSubmissionRecord["reviewStatus"];
};

export type ChatInboxSummary = {
  items: ChatInboxItem[];
  unreadCount: number;
  hasChats: boolean;
};

export type ApplicationChatAccess = {
  submission: CvSubmissionRecord | null;
  chat: ApplicationChatRecord;
  isAdminRequester: boolean;
  isArchived: boolean;
};

const normalizeKey = (value: string) => value.trim().toLowerCase();
const toIdentityRowKey = (appUserKey: string) => `acs-identity:${encodeURIComponent(normalizeKey(appUserKey))}`;
const toApplicationChatRowKey = (applicationId: string) => `application-chat:${applicationId}`;
const toChatReadStateRowKey = (requesterKey: string, applicationId: string) => (
  `chat-read:${encodeURIComponent(normalizeKey(requesterKey))}:${applicationId}`
);
const toChatMessageModerationRowKey = (applicationId: string, messageId: string) => (
  `chat-message:${applicationId}:${encodeURIComponent(messageId.trim())}`
);

const toIdentityRecord = (entity: AcsIdentityEntity): AcsIdentityRecord => ({
  appUserKey: entity.appUserKey,
  acsUserId: entity.acsUserId,
  createdAt: new Date(entity.createdAt).toISOString(),
  updatedAt: new Date(entity.updatedAt).toISOString(),
});

const toApplicationChatRecord = (entity: ApplicationChatEntity): ApplicationChatRecord => ({
  applicationId: entity.applicationId,
  jobId: entity.jobId,
  jobCode: entity.jobCode,
  jobTitle: entity.jobTitle,
  candidateEmail: entity.candidateEmail,
  adminEmail: entity.adminEmail,
  chatThreadId: entity.chatThreadId,
  createdAt: new Date(entity.createdAt).toISOString(),
  updatedAt: new Date(entity.updatedAt).toISOString(),
  deletedAt: entity.deletedAt ? new Date(entity.deletedAt).toISOString() : null,
  deletedBy: entity.deletedBy ?? null,
});

const toChatReadStateRecord = (entity: ChatReadStateEntity): ChatReadStateRecord => ({
  applicationId: entity.applicationId,
  requesterKey: entity.requesterKey,
  lastReadAt: entity.lastReadAt ? new Date(entity.lastReadAt).toISOString() : null,
  createdAt: new Date(entity.createdAt).toISOString(),
  updatedAt: new Date(entity.updatedAt).toISOString(),
});

const toChatMessageModerationRecord = (
  entity: ChatMessageModerationEntity,
): ChatMessageModerationRecord => ({
  applicationId: entity.applicationId,
  messageId: entity.messageId,
  deletedAt: new Date(entity.deletedAt).toISOString(),
  deletedBy: entity.deletedBy,
  createdAt: new Date(entity.createdAt).toISOString(),
  updatedAt: new Date(entity.updatedAt).toISOString(),
});

const getCommunicationConnectionString = () => {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING?.trim();

  if (!connectionString) {
    throw new Error("Azure Communication Services is not configured. Set AZURE_COMMUNICATION_CONNECTION_STRING.");
  }

  return connectionString;
};

const parseConnectionStringValue = (key: string) => {
  const parts = getCommunicationConnectionString()
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const match = parts.find((part) => part.toLowerCase().startsWith(`${key.toLowerCase()}=`));
  return match ? match.slice(key.length + 1) : "";
};

const getCommunicationEndpoint = () => {
  const endpoint = parseConnectionStringValue("endpoint");

  if (!endpoint) {
    throw new Error("Azure Communication Services endpoint is missing from the connection string.");
  }

  return endpoint.replace(/\/+$/, "");
};

let identityClientCache: CommunicationIdentityClient | null = null;

const getIdentityClient = () => {
  if (identityClientCache) {
    return identityClientCache;
  }

  identityClientCache = new CommunicationIdentityClient(getCommunicationConnectionString());
  return identityClientCache;
};

const getDisplayNameForEmail = async (email: string) => {
  const normalizedEmail = normalizeKey(email);
  const candidateProfile = await getCandidateProfileByEmail(normalizedEmail);
  const fullName = [candidateProfile?.firstName, candidateProfile?.lastName].filter(Boolean).join(" ").trim();
  return fullName || normalizedEmail;
};

const getMessageSenderAcsUserId = (message: Pick<ChatMessage, "sender">) => {
  if (message.sender && "communicationUserId" in message.sender) {
    return message.sender.communicationUserId ?? null;
  }

  return null;
};

const getMessagePreview = (message: ChatMessage) => {
  const content = message.content?.message?.trim();

  if (content) {
    return content;
  }

  if (message.type === "participantAdded") {
    return "Participants updated.";
  }

  if (message.type === "topicUpdated") {
    return "Conversation details updated.";
  }

  return "Conversation started.";
};

export const getAcsIdentityByAppUserKey = async (appUserKey: string): Promise<AcsIdentityRecord | null> => {
  const normalizedKey = normalizeKey(appUserKey);

  if (!normalizedKey) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<AcsIdentityEntity>(CHAT_SCOPE, toIdentityRowKey(normalizedKey));

    if (entity.type !== ACS_IDENTITY_TYPE) {
      return null;
    }

    return toIdentityRecord(entity);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const ensureAcsIdentityForAppUser = async (appUserKey: string) => {
  const normalizedKey = normalizeKey(appUserKey);

  if (!normalizedKey) {
    throw new Error("ACS identity requires a valid app user key.");
  }

  const existing = await getAcsIdentityByAppUserKey(normalizedKey);

  if (existing) {
    return existing;
  }

  const identityClient = getIdentityClient();
  const user = await identityClient.createUser();
  const now = Date.now();
  const tableClient = await getAppTableClient();

  const entity: AcsIdentityEntity = {
    partitionKey: CHAT_SCOPE,
    rowKey: toIdentityRowKey(normalizedKey),
    type: ACS_IDENTITY_TYPE,
    appUserKey: normalizedKey,
    acsUserId: user.communicationUserId,
    createdAt: now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toIdentityRecord(entity);
};

export const issueAcsTokenForEmail = async (email: string) => {
  const identity = await ensureAcsIdentityForAppUser(email);
  const identityClient = getIdentityClient();
  const token = await identityClient.getToken(
    { communicationUserId: identity.acsUserId },
    ["chat"],
    { tokenExpiresInMinutes: ACS_TOKEN_TTL_MINUTES },
  );

  return {
    endpoint: getCommunicationEndpoint(),
    acsUserId: identity.acsUserId,
    token: token.token,
    expiresOn: token.expiresOn.toISOString(),
  };
};

const getApplicationChatEntityByApplicationId = async (
  applicationId: string,
): Promise<ApplicationChatEntity | null> => {
  const normalizedId = applicationId.trim();

  if (!normalizedId) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<ApplicationChatEntity>(
      CHAT_SCOPE,
      toApplicationChatRowKey(normalizedId),
    );

    if (entity.type !== APPLICATION_CHAT_TYPE) {
      return null;
    }

    return entity;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const getApplicationChatByApplicationId = async (
  applicationId: string,
): Promise<ApplicationChatRecord | null> => {
  const entity = await getApplicationChatEntityByApplicationId(applicationId);

  if (!entity || entity.deletedAt) {
    return null;
  }

  return toApplicationChatRecord(entity);
};

const listApplicationChats = async (): Promise<ApplicationChatRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<ApplicationChatEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${CHAT_SCOPE}' and type eq '${APPLICATION_CHAT_TYPE}'`,
    },
  });

  const items: ApplicationChatRecord[] = [];

  for await (const entity of entities) {
    if (!entity.deletedAt) {
      items.push(toApplicationChatRecord(entity));
    }
  }

  return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

const saveApplicationChat = async (record: Omit<ApplicationChatEntity, "partitionKey" | "rowKey" | "type">) => {
  const tableClient = await getAppTableClient();
  const entity: ApplicationChatEntity = {
    partitionKey: CHAT_SCOPE,
    rowKey: toApplicationChatRowKey(record.applicationId),
    type: APPLICATION_CHAT_TYPE,
    ...record,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toApplicationChatRecord(entity);
};

export const getChatReadState = async (
  requesterKey: string,
  applicationId: string,
): Promise<ChatReadStateRecord | null> => {
  const normalizedRequesterKey = normalizeKey(requesterKey);

  if (!normalizedRequesterKey || !applicationId.trim()) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<ChatReadStateEntity>(
      CHAT_SCOPE,
      toChatReadStateRowKey(normalizedRequesterKey, applicationId.trim()),
    );

    if (entity.type !== CHAT_READ_STATE_TYPE) {
      return null;
    }

    return toChatReadStateRecord(entity);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const markApplicationChatRead = async (
  applicationId: string,
  requesterKey: string,
  lastReadAt?: Date,
) => {
  const normalizedRequesterKey = normalizeKey(requesterKey);
  const normalizedApplicationId = applicationId.trim();

  if (!normalizedRequesterKey || !normalizedApplicationId) {
    throw new Error("Application chat read state requires a valid requester and application.");
  }

  const existing = await getChatReadState(normalizedRequesterKey, normalizedApplicationId);
  const now = Date.now();
  const effectiveLastReadAt = lastReadAt ? lastReadAt.getTime() : now;
  const tableClient = await getAppTableClient();

  const entity: ChatReadStateEntity = {
    partitionKey: CHAT_SCOPE,
    rowKey: toChatReadStateRowKey(normalizedRequesterKey, normalizedApplicationId),
    type: CHAT_READ_STATE_TYPE,
    applicationId: normalizedApplicationId,
    requesterKey: normalizedRequesterKey,
    lastReadAt: effectiveLastReadAt,
    createdAt: existing ? Date.parse(existing.createdAt) : now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toChatReadStateRecord(entity);
};

export const listChatMessageModerations = async (
  applicationId: string,
): Promise<ChatMessageModerationRecord[]> => {
  const normalizedApplicationId = applicationId.trim();

  if (!normalizedApplicationId) {
    return [];
  }

  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<ChatMessageModerationEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${CHAT_SCOPE}' and type eq '${CHAT_MESSAGE_MODERATION_TYPE}' and applicationId eq '${normalizedApplicationId.replace(/'/g, "''")}'`,
    },
  });

  const items: ChatMessageModerationRecord[] = [];

  for await (const entity of entities) {
    items.push(toChatMessageModerationRecord(entity));
  }

  return items;
};

const saveChatMessageModeration = async ({
  applicationId,
  messageId,
  deletedBy,
}: {
  applicationId: string;
  messageId: string;
  deletedBy: string;
}) => {
  const normalizedApplicationId = applicationId.trim();
  const normalizedMessageId = messageId.trim();
  const normalizedDeletedBy = normalizeKey(deletedBy);

  if (!normalizedApplicationId || !normalizedMessageId || !normalizedDeletedBy) {
    throw new Error("Chat moderation requires a valid application, message, and actor.");
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();
  const entity: ChatMessageModerationEntity = {
    partitionKey: CHAT_SCOPE,
    rowKey: toChatMessageModerationRowKey(normalizedApplicationId, normalizedMessageId),
    type: CHAT_MESSAGE_MODERATION_TYPE,
    applicationId: normalizedApplicationId,
    messageId: normalizedMessageId,
    deletedAt: now,
    deletedBy: normalizedDeletedBy,
    createdAt: now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toChatMessageModerationRecord(entity);
};

const createServerChatClientForAcsUser = async (acsUserId: string) => {
  const identityClient = getIdentityClient();
  const token = await identityClient.getToken(
    { communicationUserId: acsUserId },
    ["chat"],
    { tokenExpiresInMinutes: ACS_TOKEN_TTL_MINUTES },
  );

  return new ChatClient(
    getCommunicationEndpoint(),
    new AzureCommunicationTokenCredential(token.token),
  );
};

export const deleteApplicationChatMessageAsAdmin = async ({
  applicationId,
  requesterEmail,
  messageId,
}: {
  applicationId: string;
  requesterEmail: string;
  messageId: string;
}) => {
  const normalizedMessageId = messageId.trim();

  if (!normalizedMessageId) {
    throw new Error("A valid chat message id is required.");
  }

  const access = await ensureApplicationChatAccess(applicationId, requesterEmail);

  if (!access.isAdminRequester) {
    throw new Error("Only admins can delete chat messages.");
  }

  const requesterIdentity = await ensureAcsIdentityForAppUser(requesterEmail);
  const chatClient = await createServerChatClientForAcsUser(requesterIdentity.acsUserId);
  const threadClient = chatClient.getChatThreadClient(access.chat.chatThreadId);
  let deletionMode: "acs" | "moderated" = "acs";

  try {
    await threadClient.deleteMessage(normalizedMessageId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!/Forbidden|doesn't have the permission|permission to perform/i.test(message)) {
      throw error;
    }

    deletionMode = "moderated";
    await saveChatMessageModeration({
      applicationId: access.chat.applicationId,
      messageId: normalizedMessageId,
      deletedBy: requesterEmail,
    });
  }

  return {
    applicationId: access.chat.applicationId,
    messageId: normalizedMessageId,
    deletionMode,
  };
};

export const deleteAllChatsForCandidateAsAdmin = async ({
  candidateEmail,
  requesterEmail,
}: {
  candidateEmail: string;
  requesterEmail: string;
}) => {
  const normalizedCandidateEmail = normalizeKey(candidateEmail);
  const normalizedRequesterEmail = normalizeKey(requesterEmail);

  if (!normalizedCandidateEmail) {
    throw new Error("A valid candidate email is required.");
  }

  const requesterIsAdmin = await isAdminEmail(normalizedRequesterEmail);

  if (!requesterIsAdmin) {
    throw new Error("Only admins can delete user chats.");
  }

  const tableClient = await getAppTableClient();
  const requesterIdentity = await ensureAcsIdentityForAppUser(normalizedRequesterEmail);
  const chatClient = await createServerChatClientForAcsUser(requesterIdentity.acsUserId);
  const chats = (await listApplicationChats()).filter((chat) => normalizeKey(chat.candidateEmail) === normalizedCandidateEmail);

  for (const chat of chats) {
    try {
      await chatClient.deleteChatThread(chat.chatThreadId);
    } catch {
      // Ignore ACS delete failures so the app can still tombstone the conversation locally.
    }

    const existingEntity = await getApplicationChatEntityByApplicationId(chat.applicationId);

    if (!existingEntity) {
      continue;
    }

    const now = Date.now();
    const entity: ApplicationChatEntity = {
      ...existingEntity,
      updatedAt: now,
      deletedAt: now,
      deletedBy: normalizedRequesterEmail,
    };

    await tableClient.upsertEntity(entity, "Replace");
  }

  return {
    candidateEmail: normalizedCandidateEmail,
    deletedChatCount: chats.length,
  };
};

const ensureParticipantOnThread = async ({
  chatThreadId,
  email,
}: {
  chatThreadId: string;
  email: string;
}) => {
  const identity = await ensureAcsIdentityForAppUser(email);
  const chatClient = await createServerChatClientForAcsUser(identity.acsUserId);
  const threadClient = chatClient.getChatThreadClient(chatThreadId);

  const participants: string[] = [];
  for await (const participant of threadClient.listParticipants()) {
    if ("communicationUserId" in participant.id && participant.id.communicationUserId) {
      participants.push(participant.id.communicationUserId);
    }
  }

  if (!participants.includes(identity.acsUserId)) {
    await threadClient.addParticipants({
      participants: [{
        id: { communicationUserId: identity.acsUserId },
        displayName: await getDisplayNameForEmail(email),
        shareHistoryTime: new Date(),
      }],
    });
  }
};

export const ensureApplicationChatForSubmission = async (
  submission: CvSubmissionRecord,
  actorEmail: string,
) => {
  if (submission.reviewStatus !== "accepted") {
    throw new Error("Chat can only be created for accepted applications.");
  }

  const existing = await getApplicationChatByApplicationId(submission.id);

  if (existing) {
    await ensureParticipantOnThread({ chatThreadId: existing.chatThreadId, email: actorEmail });
    return existing;
  }

  const candidateIdentity = await ensureAcsIdentityForAppUser(submission.email);
  const actorIdentity = await ensureAcsIdentityForAppUser(actorEmail);
  const adminEmail = normalizeKey(submission.reviewedBy || actorEmail);
  const adminIdentity = await ensureAcsIdentityForAppUser(adminEmail);
  const creatorAcsUserId = actorIdentity.acsUserId;
  const chatClient = await createServerChatClientForAcsUser(creatorAcsUserId);

  const createResult = await chatClient.createChatThread(
    {
      topic: `${submission.jobCode || "Job"} • ${submission.jobTitle || submission.jobOpening}`,
    },
    {
      participants: [
        {
          id: { communicationUserId: candidateIdentity.acsUserId },
          displayName: await getDisplayNameForEmail(submission.email),
          shareHistoryTime: new Date(),
        },
        {
          id: { communicationUserId: adminIdentity.acsUserId },
          displayName: await getDisplayNameForEmail(adminEmail),
          shareHistoryTime: new Date(),
        },
      ],
    },
  );

  const chatThreadId = createResult.chatThread?.id;

  if (!chatThreadId) {
    throw new Error("Azure Communication Services did not return a chat thread ID.");
  }

  return saveApplicationChat({
    applicationId: submission.id,
    jobId: submission.jobId,
    jobCode: submission.jobCode,
    jobTitle: submission.jobTitle || submission.jobOpening,
    candidateEmail: normalizeKey(submission.email),
    adminEmail,
    chatThreadId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

export const ensureApplicationChatAccess = async (
  applicationId: string,
  requesterEmail: string,
): Promise<ApplicationChatAccess> => {
  const normalizedRequesterEmail = normalizeKey(requesterEmail);
  const isAdminRequester = await isAdminEmail(normalizedRequesterEmail);
  const submission = await getCvSubmissionById(applicationId);

  if (submission) {
    if (submission.reviewStatus !== "accepted") {
      throw new Error("Chat is only available for accepted applications.");
    }

    if (!isAdminRequester && normalizedRequesterEmail !== normalizeKey(submission.email)) {
      throw new Error("You do not have access to this chat.");
    }

    const chat = await ensureApplicationChatForSubmission(submission, requesterEmail);

    if (isAdminRequester || normalizedRequesterEmail === normalizeKey(submission.email)) {
      await ensureParticipantOnThread({ chatThreadId: chat.chatThreadId, email: requesterEmail });
    }

    return {
      submission,
      chat,
      isAdminRequester,
      isArchived: false,
    };
  }

  const chat = await getApplicationChatByApplicationId(applicationId);

  if (!chat) {
    throw new Error("Application chat not found.");
  }

  if (
    !isAdminRequester
    && normalizedRequesterEmail !== normalizeKey(chat.candidateEmail)
    && normalizedRequesterEmail !== normalizeKey(chat.adminEmail)
  ) {
    throw new Error("You do not have access to this chat.");
  }

  await ensureParticipantOnThread({ chatThreadId: chat.chatThreadId, email: requesterEmail });

  return {
    chat,
    isAdminRequester,
    submission: null,
    isArchived: true,
  };
};

const getLatestThreadSnapshot = async (
  chatClient: ChatClient,
  chatThreadId: string,
) => {
  const threadClient = chatClient.getChatThreadClient(chatThreadId);
  let latestMessage: ChatMessage | null = null;

  for await (const message of threadClient.listMessages()) {
    if (!latestMessage || latestMessage.createdOn < message.createdOn) {
      latestMessage = message;
    }
  }

  if (!latestMessage) {
    return {
      latestMessagePreview: "Conversation ready.",
      latestMessageAt: null,
      latestSenderAcsUserId: null,
      latestMessageType: "none" as const,
    };
  }

  return {
    latestMessagePreview: getMessagePreview(latestMessage),
    latestMessageAt: latestMessage.createdOn.toISOString(),
    latestSenderAcsUserId: getMessageSenderAcsUserId(latestMessage),
    latestMessageType: latestMessage.type === "text" || latestMessage.type === "html" ? "message" as const : "system" as const,
  };
};

export const listChatInboxForRequester = async (
  requesterEmail: string,
): Promise<ChatInboxSummary> => {
  const normalizedRequesterEmail = normalizeKey(requesterEmail);
  const adminRequester = await isAdminEmail(normalizedRequesterEmail);
  const chats = await listApplicationChats();
  const accessibleChatMap = new Map(
    chats
      .filter((chat) => (
    adminRequester || normalizeKey(chat.candidateEmail) === normalizedRequesterEmail
      ))
      .map((chat) => [chat.applicationId, chat] as const),
  );

  if (!adminRequester) {
    const candidateSubmissions = await listCvSubmissionsByEmail(normalizedRequesterEmail);
    const acceptedSubmissions = candidateSubmissions.filter((submission) => submission.reviewStatus === "accepted");

    for (const submission of acceptedSubmissions) {
      if (accessibleChatMap.has(submission.id)) {
        continue;
      }

      try {
        const ensuredChat = await ensureApplicationChatForSubmission(submission, normalizedRequesterEmail);
        accessibleChatMap.set(ensuredChat.applicationId, ensuredChat);
      } catch {
        // Ignore per-chat creation failures so the inbox can still render available conversations.
      }
    }
  }

  const accessibleChats = [...accessibleChatMap.values()];

  if (accessibleChats.length === 0) {
    return {
      items: [],
      unreadCount: 0,
      hasChats: false,
    };
  }

  const requesterIdentity = await ensureAcsIdentityForAppUser(normalizedRequesterEmail);
  const chatClient = await createServerChatClientForAcsUser(requesterIdentity.acsUserId);

  const items = await Promise.all(accessibleChats.map(async (chat) => {
    if (adminRequester) {
      await ensureParticipantOnThread({ chatThreadId: chat.chatThreadId, email: normalizedRequesterEmail });
    }

    const [submission, readState, snapshot] = await Promise.all([
      getCvSubmissionById(chat.applicationId),
      getChatReadState(normalizedRequesterEmail, chat.applicationId),
      getLatestThreadSnapshot(chatClient, chat.chatThreadId),
    ]);

    const candidateName = await getDisplayNameForEmail(chat.candidateEmail);
    const participantLabel = adminRequester ? candidateName : "Hiring team";
    const participantSecondaryLabel = adminRequester
      ? chat.candidateEmail
      : chat.adminEmail;
    const participantKey = adminRequester
      ? normalizeKey(chat.candidateEmail)
      : normalizeKey(chat.adminEmail);
    const unread = Boolean(
      snapshot.latestMessageAt
      && snapshot.latestMessageType === "message"
      && snapshot.latestSenderAcsUserId
      && snapshot.latestSenderAcsUserId !== requesterIdentity.acsUserId
      && (!readState?.lastReadAt || new Date(readState.lastReadAt).getTime() < new Date(snapshot.latestMessageAt).getTime())
    );

    return {
      applicationId: chat.applicationId,
      jobId: chat.jobId,
      jobCode: chat.jobCode,
      jobTitle: chat.jobTitle,
      participantKey,
      participantLabel,
      participantSecondaryLabel,
      latestMessagePreview: snapshot.latestMessagePreview,
      latestMessageAt: snapshot.latestMessageAt,
      unread,
      reviewStatus: submission?.reviewStatus ?? "accepted",
    } satisfies ChatInboxItem;
  }));

  const sortedItems = items.sort((left, right) => {
    const leftTime = left.latestMessageAt ? new Date(left.latestMessageAt).getTime() : 0;
    const rightTime = right.latestMessageAt ? new Date(right.latestMessageAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return {
    items: sortedItems,
    unreadCount: sortedItems.filter((item) => item.unread).length,
    hasChats: sortedItems.length > 0,
  };
};
