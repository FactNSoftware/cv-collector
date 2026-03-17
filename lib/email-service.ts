import { EmailClient } from "@azure/communication-email";

const COMMUNICATION_CONNECTION_STRING_ENV = "AZURE_COMMUNICATION_CONNECTION_STRING";
const EMAIL_SENDER_ADDRESS_ENV = "AZURE_EMAIL_SENDER_ADDRESS";

let emailClientCache: EmailClient | null = null;

export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export const getAzureEmailConfig = () => {
  const connectionString = process.env[COMMUNICATION_CONNECTION_STRING_ENV];
  const senderAddress = process.env[EMAIL_SENDER_ADDRESS_ENV];

  const missing: string[] = [];

  if (!connectionString) {
    missing.push(COMMUNICATION_CONNECTION_STRING_ENV);
  }

  if (!senderAddress) {
    missing.push(EMAIL_SENDER_ADDRESS_ENV);
  }

  if (missing.length > 0) {
    throw new Error(
      `Azure Email configuration is missing. Set: ${missing.join(", ")}`,
    );
  }

  return {
    connectionString,
    senderAddress,
  };
};

export const getEmailClient = () => {
  if (emailClientCache) {
    return emailClientCache;
  }

  const config = getAzureEmailConfig();
  emailClientCache = new EmailClient(config.connectionString as string);

  return emailClientCache;
};

export const sendTransactionalEmail = async (
  recipientEmail: string,
  template: EmailTemplate,
) => {
  const config = getAzureEmailConfig();
  const client = getEmailClient();
  const poller = await client.beginSend({
    senderAddress: config.senderAddress as string,
    recipients: {
      to: [{ address: recipientEmail }],
    },
    content: {
      subject: template.subject,
      plainText: template.text,
      html: template.html,
    },
  });

  const result = await poller.pollUntilDone();

  if (!result || result.status !== "Succeeded") {
    const details = result?.error?.message ?? "Unknown Azure Email error.";
    throw new Error(`Failed to send email: ${details}`);
  }
};
