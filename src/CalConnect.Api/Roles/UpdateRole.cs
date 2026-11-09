using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;

namespace CalConnect.Api.Roles;

internal sealed class UpdateRole(AppDbContext context)
{
    public sealed record Request(int Id, string Name);

    public async Task<bool> Handle(Request request, CancellationToken cancellationToken)
    {
        Role? role = await context.Roles.FindAsync([request.Id], cancellationToken);

        if (role is null)
        {
            return false;
        }

        role.Name = request.Name;
        await context.SaveChangesAsync(cancellationToken);

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("roles/{id}", async (
                Request request,
                UpdateRole handler,
                CancellationToken cancellationToken) =>
            {
                bool success = await handler.Handle(request, cancellationToken);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(RoleEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
