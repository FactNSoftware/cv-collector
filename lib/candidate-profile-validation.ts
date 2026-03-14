import { z } from "zod";

const sriLankanPhonePattern = /^(?:\+94|94|0)?(?:7\d{8})$/;
const sriLankanNicPattern = /^(?:\d{9}[VvXx]|\d{12})$/;
const passportPattern = /^(?=.*[A-Za-z])[A-Za-z0-9]{6,9}$/;

const normalizePhone = (value: string) => value.replace(/[\s-]/g, "");
const normalizeIdentity = (value: string) => value.replace(/\s/g, "");

export const candidateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name is too long."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name is too long."),
  phone: z
    .string()
    .trim()
    .min(1, "Mobile number is required.")
    .transform(normalizePhone)
    .refine(
      (value) => sriLankanPhonePattern.test(value),
      "Enter a valid Sri Lankan mobile number.",
    ),
  idOrPassportNumber: z
    .string()
    .trim()
    .min(1, "NIC or passport number is required.")
    .transform(normalizeIdentity)
    .refine(
      (value) => sriLankanNicPattern.test(value) || passportPattern.test(value),
      "Enter a valid NIC or passport number. NIC must be 12 digits or 9 digits plus V/X. Passport must include letters.",
    ),
});

export type CandidateProfileFormValues = z.infer<typeof candidateProfileSchema>;

export const validateCandidateProfile = (input: CandidateProfileFormValues) => {
  return candidateProfileSchema.safeParse(input);
};
