using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/state")]
public sealed class StateController : ControllerBase
{
    private readonly IProfileAppService _profileService;

    public StateController(IProfileAppService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>
    /// Retorna o estado global sincronizado (perfil, Izanagi, missões e logs recentes) executando a checagem diária do Amaterasu.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(AppStateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetState(CancellationToken cancellationToken)
    {
        var result = await _profileService.GetFullStateAsync(cancellationToken);
        return result.ToActionResult(this);
    }
}
