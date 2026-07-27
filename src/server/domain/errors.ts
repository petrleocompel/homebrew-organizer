export type DomainErrorCode =
	| "AUTHENTICATION_REQUIRED"
	| "FORBIDDEN"
	| "MEMBERSHIP_DISABLED"
	| "NOT_FOUND"
	| "VALIDATION_FAILED"
	| "BOTTLE_ALREADY_FILLED"
	| "BOTTLE_RETIRED"
	| "FILL_ALREADY_EMPTIED"
	| "INVALID_FILL_TRANSITION"
	| "IDEMPOTENCY_KEY_REQUIRED"
	| "IDEMPOTENCY_KEY_REUSED"
	| "INVITE_INVALID"
	| "INVITE_EXPIRED"
	| "RECIPE_INVALID"
	| "UPLOAD_TOO_LARGE"
	| "PDF_INVALID"
	| "QR_UNSAFE"
	| "PRINT_CONFIRMATION_REQUIRED"
	| "CONFLICT"
	| "INTERNAL_ERROR";

export class DomainError extends Error {
	readonly code: DomainErrorCode;
	readonly status: number;
	readonly details: Record<string, unknown>;

	constructor(
		code: DomainErrorCode,
		message: string,
		status = 400,
		details: Record<string, unknown> = {},
	) {
		super(message);
		this.name = "DomainError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export function isDomainError(error: unknown): error is DomainError {
	return error instanceof DomainError;
}
