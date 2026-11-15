using System.Security.Claims;
using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Users;

internal sealed class DeleteUser(AppDbContext context, IHttpContextAccessor httpContextAccessor)
{
    public async Task<bool> Handle(Guid userId)
    {
        if (userId == GetCurrentUserId())
        {
            throw new ApplicationException("You can't remove your own account");
        }

        // Meetings reference users only by id inside owned-JSON participants (no FK),
        // so removing a user is limited to its role links and auth tokens.
        await context.UserRoles
            .Where(ur => ur.UserId == userId)
            .ExecuteDeleteAsync();

        await context.RefreshTokens
            .Where(r => r.UserId == userId)
            .ExecuteDeleteAsync();

        await context.EmailVerificationTokens
            .Where(t => t.UserId == userId)
            .ExecuteDeleteAsync();

        int rows = await context.Users
            .Where(u => u.Id == userId)
            .ExecuteDeleteAsync();

        return rows > 0;
    }

    private Guid? GetCurrentUserId()
    {
        ClaimsPrincipal? principal = httpContextAccessor.HttpContext?.User;
        string? id = principal?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return Guid.TryParse(id, out Guid parsed) ? parsed : null;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("admin/users/{id:guid}", async (Guid id, DeleteUser handler) =>
            {
                bool success = await handler.Handle(id);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(UserEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
