using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/stats")]
public sealed class StatsController : ControllerBase
{
    private readonly IStatsAppService _statsService;

    public StatsController(IStatsAppService statsService)
    {
        _statsService = statsService;
    }

    /// <summary>
    /// Retorna os KPIs, Heatmap de 365 dias, distribuição por Rank e logs recentes para o Pergaminho de Estatísticas.
    /// </summary>
    [HttpGet("scroll")]
    [ProducesResponseType(typeof(ScrollStatsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetScrollStats(
        [FromQuery] string? rank = null,
        [FromQuery] bool? completed = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _statsService.GetScrollStatsAsync(rank, completed, cancellationToken);
        return result.ToActionResult(this);
    }
}
