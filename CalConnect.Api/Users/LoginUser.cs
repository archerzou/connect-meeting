using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Users.Infrastructure;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Users;

internal sealed class LoginUser(AppDbContext context, PasswordHasher passwordHasher, TokenProvider tokenProvider)
{
    public sealed record Request(string Email, string Password);
    public sealed record Response(string AccessToken, string RefreshToken);

    public async Task<Response> Handle(Request request)
    {
        User? user = await context.Users.GetByEmail(request.Email);

        if (user is null || !user.EmailVerified)
        {
            throw new ApplicationException("The user was not found");
        }

        bool verified = passwordHasher.Verify(request.Password, user.PasswordHash);

        if (!verified)
        {
            throw new ApplicationException("The password is incorrect");
        }

        string token = tokenProvider.Create(user);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = tokenProvider.GenerateRefreshToken(),
            ExpiresOnUtc = DateTime.UtcNow.AddDays(7)
        };

        context.RefreshTokens.Add(refreshToken);

        await context.SaveChangesAsync();

        return new Response(token, refreshToken.Token);
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("users/login", async (Request request, LoginUser useCase) =>
                await useCase.Handle(request))
                .WithTags(UserEndpoints.Tag);
        }
    }
}
