using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;

namespace TsukuyomiFocus.Api.Controllers;

[ApiController]
[Route("api/missions")]
public sealed class MissionsController : ControllerBase
{
    private readonly IMissionAppService _missionService;

    public MissionsController(IMissionAppService missionService)
    {
        _missionService = missionService;
    }

    /// <summary>
    /// Lista todas as missões do Kanban ordenadas por Amaterasu, Rank (S -> D) e data de criação.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MissionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await _missionService.GetAllAsync(GetCancellationToken());
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Cria uma nova missão no Kanban aplicando tempo estimado padrão do Rank quando omitido.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(MissionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMissionRequest request)
    {
        var result = await _missionService.CreateAsync(request, GetCancellationToken());
        if (!result.IsSuccess)
        {
            return result.ToActionResult(this);
        }

        return CreatedAtAction(nameof(GetAll), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Atualiza título, descrição, Rank e tempo estimado de uma missão.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(MissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMissionRequest request)
    {
        var result = await _missionService.UpdateAsync(id, request, GetCancellationToken());
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Move uma missão entre as colunas do Kanban (todo, in_tsukuyomi, completed).
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(MissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateMissionStatusRequest request)
    {
        var result = await _missionService.UpdateStatusAsync(id, request, GetCancellationToken());
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Ativa ou desativa as chamas negras do Amaterasu (limite de 1 missão por dia).
    /// </summary>
    [HttpPost("{id:guid}/amaterasu")]
    [DefaultEmptyBodyJsonContentType]
    [ProducesResponseType(typeof(MissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleAmaterasu(
        Guid id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ToggleAmaterasuRequest? request = null)
    {
        var result = await _missionService.ToggleAmaterasuAsync(id, request, GetCancellationToken());
        return result.ToActionResult(this);
    }

    /// <summary>
    /// Remove uma missão do Kanban.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _missionService.DeleteAsync(id, GetCancellationToken());
        if (!result.IsSuccess)
        {
            return result.ToActionResult(this);
        }

        return NoContent();
    }

    private CancellationToken GetCancellationToken() =>
        HttpContext?.RequestAborted ?? CancellationToken.None;

    /// <summary>
    /// Allows body-less POST requests without a Content-Type header to bind cleanly as null via EmptyBodyBehavior.Allow.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    private sealed class DefaultEmptyBodyJsonContentTypeAttribute : Attribute, IResourceFilter
    {
        public void OnResourceExecuting(ResourceExecutingContext context)
        {
            var request = context.HttpContext.Request;
            if (string.IsNullOrWhiteSpace(request.ContentType) && (request.ContentLength is null or 0))
            {
                request.ContentType = "application/json";
            }
        }

        public void OnResourceExecuted(ResourceExecutedContext context)
        {
        }
    }
}
