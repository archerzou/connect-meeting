using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Roles;

internal sealed class GetRoles(AppDbContext context)
{
    public sealed record Response(int Id, string Name);

    public async Task<List<Response>> Handle(CancellationToken cancellationToken)
    {
        return await context.Roles
            .Select(r => new Response(r.Id, r.Name))
            .ToListAsync(cancellationToken);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("roles", async (
                GetRoles handler,
                CancellationToken cancellationToken) =>
            {
                List<Response> response = await handler.Handle(cancellationToken);
                return Results.Ok(response);
            })
            .WithTags(RoleEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
