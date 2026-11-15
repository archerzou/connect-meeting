using System.Security.Claims;
using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Users;

internal sealed class UpdateUserRole(AppDbContext context, IHttpContextAccessor httpContextAccessor)
{
    public sealed record Request(string Role);

    public async Task<bool> Handle(Guid userId, Request request)
    {
        if (userId == GetCurrentUserId())
        {
            throw new ApplicationException("You can't change your own role");
        }

        Role? role = await context.Roles
            .FirstOrDefaultAsync(r => r.Name == request.Role);

        if (role is null)
        {
            throw new ApplicationException($"Unknown role '{request.Role}'");
        }

        bool userExists = await context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            return false;
        }

        // Replace the user's roles with the single chosen role.
        await context.UserRoles
            .Where(ur => ur.UserId == userId)
            .ExecuteDeleteAsync();

        context.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.Id });
        await context.SaveChangesAsync();

        return true;
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
            app.MapPut("admin/users/{id:guid}/role", async (
                Guid id,
                Request request,
                UpdateUserRole handler) =>
            {
                bool success = await handler.Handle(id, request);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(UserEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
