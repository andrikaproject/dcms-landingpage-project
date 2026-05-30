export function getFirstActionError(result, fallback = "Request tidak valid.") {
    if (result?.serverError) {
        return result.serverError;
    }

    const fieldErrors = result?.validationErrors?.fieldErrors;
    const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat().find(Boolean)
        : null;

    return (
        firstFieldError ||
        result?.validationErrors?.formErrors?.[0] ||
        fallback
    );
}
