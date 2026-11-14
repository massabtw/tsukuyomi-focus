using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    private readonly IDbConnectionFactory _connectionFactory;

    public HealthController(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <summary>
    /// Verifica a saúde da API e a conectividade com o PostgreSQL.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(HealthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HealthResponseDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        try
        {
            await using var conn = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1;";
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            var ping = Convert.ToInt32(result);

            return Ok(new HealthResponseDto
            {
                Status = ping == 1 ? "healthy" : "degraded",
                Database = "connected",
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new HealthResponseDto
            {
                Status = "unhealthy",
                Database = "disconnected",
                Timestamp = DateTime.UtcNow
            });
        }
    }
}
