using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Exceptions;

namespace TsukuyomiFocus.Api.Filters;

public sealed class DomainExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        switch (context.Exception)
        {
            case NotFoundException notFoundEx:
                context.Result = new NotFoundObjectResult(new ApiErrorResponse
                {
                    Error = notFoundEx.Message,
                    Code = notFoundEx.Code
                });
                context.ExceptionHandled = true;
                break;

            case DomainException domainEx:
                context.Result = new BadRequestObjectResult(new ApiErrorResponse
                {
                    Error = domainEx.Message,
                    Code = domainEx.Code
                });
                context.ExceptionHandled = true;
                break;
        }
    }
}
