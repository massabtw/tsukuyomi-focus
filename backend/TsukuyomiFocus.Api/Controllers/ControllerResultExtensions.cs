using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;

namespace TsukuyomiFocus.Api.Controllers;

public static class ControllerResultExtensions
{
    public static IActionResult ToActionResult<T>(this ServiceResult<T> result, ControllerBase controller)
    {
        if (result.IsSuccess)
        {
            return controller.Ok(result.Value);
        }

        var errorBody = new ApiErrorResponse
        {
            Error = result.Error ?? "Erro inesperado.",
            Code = result.ErrorCode
        };

        return result.ErrorType switch
        {
            ServiceErrorType.NotFound => controller.NotFound(errorBody),
            ServiceErrorType.BadRequest => controller.BadRequest(errorBody),
            _ => controller.StatusCode(StatusCodes.Status500InternalServerError, errorBody)
        };
    }
}
