using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Users;

internal sealed class GetUsersForAdmin(AppDbContext context)
{
    public sealed record Response(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        bool EmailVerified,
        List<string> Roles);

    public async Task<List<Response>> Handle(CancellationToken cancellationToken)
    {
        return await context.Users
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Select(u => new Response(
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.EmailVerified,
                context.UserRoles
                    .Where(ur => ur.UserId == u.Id)
                    .Select(ur => ur.Role.Name)
                    .ToList()))
            .ToListAsync(cancellationToken);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("admin/users", async (
                GetUsersForAdmin handler,
                CancellationToken cancellationToken) =>
            {
                List<Response> response = await handler.Handle(cancellationToken);
                return Results.Ok(response);
            })
            .WithTags(UserEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
