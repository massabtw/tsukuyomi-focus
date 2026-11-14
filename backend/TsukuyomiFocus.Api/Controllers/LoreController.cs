using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/lore")]
public sealed class LoreController : ControllerBase
{
    private readonly ISessionAppService _sessionService;

    public LoreController(ISessionAppService sessionService)
    {
        _sessionService = sessionService;
    }

    /// <summary>
    /// Invoca o Izanagi isoladamente para preservar a ofensiva e limpar o desgaste visual ao custo da luz de um olho.
    /// </summary>
    [HttpPost("izanagi")]
    [ProducesResponseType(typeof(IzanagiInvocationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> InvokeIzanagi(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] InvokeIzanagiRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _sessionService.InvokeIzanagiAsync(request, cancellationToken);
        return result.ToActionResult(this);
    }
}
