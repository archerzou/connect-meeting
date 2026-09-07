using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Users;

internal sealed class VerifyEmail(AppDbContext context)
{
    public const string VerifyEmailName = "VerifyEmail";

    public async Task<bool> Handle(Guid tokenId)
    {
        EmailVerificationToken? token = await context.EmailVerificationTokens
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == tokenId);

        if (token is null || token.ExpiresOnUtc < DateTime.UtcNow || token.User.EmailVerified)
        {
            return false;
        }

        token.User.EmailVerified = true;

        context.EmailVerificationTokens.Remove(token);

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("users/verify-email", async (Guid token, VerifyEmail useCase) =>
            {
                bool success = await useCase.Handle(token);

                return success ? Results.Ok() : Results.BadRequest("Verification token expired");
            })
            .WithTags(UserEndpoints.Tag)
            .WithName(VerifyEmailName);
        }
    }
}
