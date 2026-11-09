using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Roles.Domain;

namespace CalConnect.Api.Roles;

internal sealed class CreateRole(AppDbContext context)
{
    public sealed record Request(string Name);
    public sealed record Response(int Id, string Name);

    public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
    {
        var role = new Role
        {
            Name = request.Name
        };

        context.Roles.Add(role);
        await context.SaveChangesAsync(cancellationToken);

        return new Response(role.Id, role.Name);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("roles", async (
                Request request,
                CreateRole handler,
                CancellationToken cancellationToken) =>
            {
                Response response = await handler.Handle(request, cancellationToken);
                return Results.Ok(response);
            })
            .WithTags(RoleEndpoints.Tag)
            .RequireAuthorization(policy => policy.RequireRole(Role.Admin));
        }
    }
}
