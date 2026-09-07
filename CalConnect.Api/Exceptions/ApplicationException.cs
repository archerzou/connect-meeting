namespace CalConnect.Api.Exceptions;

public sealed class ApplicationException : Exception
{
    public ApplicationException(string message)
        : base(message)
    {
    }
}
