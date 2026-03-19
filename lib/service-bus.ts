import { ServiceBusClient } from "@azure/service-bus";

const SERVICE_BUS_CONNECTION_ENV = "AZURE_SERVICE_BUS_CONNECTION_STRING";
const OTP_QUEUE_NAME_ENV = "AZURE_SERVICE_BUS_OTP_QUEUE_NAME";
const DEFAULT_OTP_QUEUE_NAME = "otp-email";

let serviceBusClientCache: ServiceBusClient | null = null;

export const getServiceBusConfig = () => {
  const connectionString = process.env[SERVICE_BUS_CONNECTION_ENV]?.trim();
  const otpQueueName = process.env[OTP_QUEUE_NAME_ENV]?.trim() || DEFAULT_OTP_QUEUE_NAME;

  return {
    connectionString: connectionString || null,
    otpQueueName,
  };
};

export const isServiceBusConfigured = () => Boolean(getServiceBusConfig().connectionString);

export const getServiceBusClient = () => {
  if (serviceBusClientCache) {
    return serviceBusClientCache;
  }

  const { connectionString } = getServiceBusConfig();

  if (!connectionString) {
    throw new Error(`Azure Service Bus configuration is missing. Set: ${SERVICE_BUS_CONNECTION_ENV}`);
  }

  serviceBusClientCache = new ServiceBusClient(connectionString);
  return serviceBusClientCache;
};

export const getOtpEmailQueueName = () => getServiceBusConfig().otpQueueName;
