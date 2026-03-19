import type { ServiceBusReceivedMessage } from "@azure/service-bus";
import { buildOtpEmailTemplate } from "./otp-email-template";
import { sendTransactionalEmail } from "./email-service";
import { getOtpEmailQueueName, getServiceBusClient, isServiceBusConfigured } from "./service-bus";
import { markLoginOtpEmailFailed, markLoginOtpEmailQueued, markLoginOtpEmailSent } from "./auth-otp";

export type OtpEmailQueueMessage = {
  requestId: string;
  email: string;
  otpCode: string;
};

const parseOtpEmailMessage = (message: ServiceBusReceivedMessage): OtpEmailQueueMessage => {
  const body = message.body as Partial<OtpEmailQueueMessage> | undefined;
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const otpCode = typeof body?.otpCode === "string" ? body.otpCode.trim() : "";

  if (!requestId || !email || !/^\d{6}$/.test(otpCode)) {
    throw new Error("OTP queue message is invalid.");
  }

  return {
    requestId,
    email,
    otpCode,
  };
};

export const enqueueOtpEmail = async (message: OtpEmailQueueMessage) => {
  if (!isServiceBusConfigured()) {
    return false;
  }

  const client = getServiceBusClient();
  const sender = client.createSender(getOtpEmailQueueName());

  try {
    await sender.sendMessages({
      body: message,
      messageId: message.requestId,
      contentType: "application/json",
      subject: "auth-otp-email",
    });
    await markLoginOtpEmailQueued(message.email, message.requestId);
    return true;
  } finally {
    await sender.close();
  }
};

const sendOtpEmailFromMessage = async (message: OtpEmailQueueMessage) => {
  const template = buildOtpEmailTemplate({
    otpCode: message.otpCode,
    recipientEmail: message.email,
    expiresInMinutes: 5,
  });

  await sendTransactionalEmail(message.email, template);
};

export const processOtpEmailQueueBatch = async (limit = 5) => {
  if (!isServiceBusConfigured()) {
    return { processed: 0 };
  }

  const client = getServiceBusClient();
  const receiver = client.createReceiver(getOtpEmailQueueName());
  let processed = 0;

  try {
    const messages = await receiver.receiveMessages(limit, {
      maxWaitTimeInMs: 750,
    });

    for (const received of messages) {
      let parsed: OtpEmailQueueMessage | null = null;

      try {
        parsed = parseOtpEmailMessage(received);
        await sendOtpEmailFromMessage(parsed);
        await markLoginOtpEmailSent(parsed.email, parsed.requestId);
        await receiver.completeMessage(received);
        processed += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown OTP email queue error.";

        if (parsed?.email && parsed.requestId) {
          await markLoginOtpEmailFailed(parsed.email, parsed.requestId, reason);
        }

        if ((received.deliveryCount ?? 1) >= 5) {
          await receiver.deadLetterMessage(received, {
            deadLetterReason: "OtpEmailProcessingFailed",
            deadLetterErrorDescription: reason,
          });
        } else {
          await receiver.abandonMessage(received);
        }
      }
    }
  } finally {
    await receiver.close();
  }

  return { processed };
};
