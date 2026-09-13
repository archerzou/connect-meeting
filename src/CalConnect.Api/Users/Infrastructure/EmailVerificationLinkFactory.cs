namespace CalConnect.Api.Users.Infrastructure;

internal sealed class EmailVerificationLinkFactory(IConfiguration configuration)
{
    public string Create(EmailVerificationToken emailVerificationToken)
    {
        // Point at the frontend SPA page (which then calls the API to verify),
        // not at the API endpoint directly. Configurable so it works behind the
        // nginx/docker proxy as well as during local Vite dev.
        string baseUrl = (configuration["Frontend:BaseUrl"] ?? "http://localhost:4173").TrimEnd('/');

        return $"{baseUrl}/verify-email?token={emailVerificationToken.Id}";
    }
}
