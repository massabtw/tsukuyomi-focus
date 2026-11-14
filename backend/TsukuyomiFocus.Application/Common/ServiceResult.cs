namespace TsukuyomiFocus.Application.Common;

public enum ServiceErrorType
{
    None,
    BadRequest,
    NotFound
}

public sealed class ServiceResult<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public string? ErrorCode { get; }
    public ServiceErrorType ErrorType { get; }

    private ServiceResult(bool isSuccess, T? value, string? error, string? errorCode, ServiceErrorType errorType)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
        ErrorCode = errorCode;
        ErrorType = errorType;
    }

    public static ServiceResult<T> Ok(T value) =>
        new(true, value, null, null, ServiceErrorType.None);

    public static ServiceResult<T> BadRequest(string error, string? code = null) =>
        new(false, default, error, code, ServiceErrorType.BadRequest);

    public static ServiceResult<T> NotFound(string error, string? code = null) =>
        new(false, default, error, code, ServiceErrorType.NotFound);
}
