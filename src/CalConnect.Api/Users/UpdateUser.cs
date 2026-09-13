using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Users;

internal sealed class UpdateUser(AppDbContext context)
{
    public sealed record Request(Guid Id, string FirstName, string LastName, string Email);

    public async Task<bool> Handle(Request request)
    {
        User? user = await context.Users.FindAsync(request.Id);

        if (user is null)
        {
            return false;
        }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("users/{id:guid}", async (Guid id, Request request, UpdateUser useCase) =>
            {
                if (id != request.Id)
                {
                    return Results.BadRequest("Id in the route must match the Id in the request body");
                }

                bool success = await useCase.Handle(request);

                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(UserEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
