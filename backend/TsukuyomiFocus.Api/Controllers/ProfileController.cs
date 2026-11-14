using Microsoft.AspNetCore.Mvc;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/profile")]
public sealed class ProfileController : ControllerBase
{
    private readonly IProfileAppService _profileService;

    public ProfileController(IProfileAppService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>
    /// Executa a verificação diária de missões Amaterasu vencidas e aplica penalidade de Chakra se aplicável.
    /// </summary>
    [HttpPost("daily-check")]
    [ProducesResponseType(typeof(DailyCheckResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RunDailyCheck(CancellationToken cancellationToken)
    {
        var result = await _profileService.RunDailyCheckAsync(cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Atualiza olho equipado, variante do Mangekyou Sharingan ou URL/Base64 de imagem customizada.
    /// </summary>
    [HttpPatch("eye-customization")]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEyeCustomization(
        [FromBody] EyeCustomizationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _profileService.UpdateEyeCustomizationAsync(request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Endpoint utilitário para o Dev Mode do Santuário Naka (testes de Chakra, desbloqueio ocular e cegueira Izanagi).
    /// </summary>
    [HttpPost("dev-simulate")]
    [ProducesResponseType(typeof(AppStateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DevSimulate(
        [FromBody] DevSimulateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _profileService.DevSimulateAsync(request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Gera um Mangekyou Sharingan customizado via Groq AI (SVG vetorial + prompt raster + lore do Doujutsu) com suporte a análise de imagem base via Vision e opção de equipar automaticamente no perfil.
    /// </summary>
    [HttpPost("generate-sharingan")]
    [HttpPost("ai-sharingan")]
    [ProducesResponseType(typeof(GenerateSharinganResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateSharingan(
        [FromServices] IProfileAppService profileService,
        [FromBody] GenerateSharinganRequestDto? request,
        CancellationToken cancellationToken)
    {
        var result = await profileService.GenerateCustomSharinganAsync(request!, cancellationToken);
        return result.ToActionResult(this);
    }
}
