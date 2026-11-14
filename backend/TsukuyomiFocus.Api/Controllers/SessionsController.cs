using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public sealed class SessionsController : ControllerBase
{
    private readonly ISessionAppService _sessionService;

    public SessionsController(ISessionAppService sessionService)
    {
        _sessionService = sessionService;
    }

    /// <summary>
    /// Conclui um ciclo de foco, calcula Chakra (Rank + Amaterasu + Susano'o), atualiza streak, restauração ocular e evolução.
    /// </summary>
    [HttpPost("complete")]
    [ProducesResponseType(typeof(CompleteSessionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Complete(
        [FromBody] CompleteSessionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sessionService.CompleteSessionAsync(request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Registra o abandono de uma sessão, aplicando desgaste visual e penalidade de Susano'o, ou invocando o Izanagi.
    /// </summary>
    [HttpPost("abandon")]
    [ProducesResponseType(typeof(AbandonSessionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Abandon(
        [FromBody] AbandonSessionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sessionService.AbandonSessionAsync(request, cancellationToken);
        return result.ToActionResult(this);
    }
}
