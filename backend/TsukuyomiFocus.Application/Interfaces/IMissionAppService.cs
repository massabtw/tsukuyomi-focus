using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;

namespace TsukuyomiFocus.Application.Interfaces;

/// <summary>
/// Serviço de aplicação para CRUD do Kanban de Missões e selo diário do Amaterasu.
/// </summary>
public interface IMissionAppService
{
    Task<ServiceResult<IReadOnlyList<MissionDto>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<MissionDto>> CreateAsync(CreateMissionRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<MissionDto>> UpdateAsync(Guid id, UpdateMissionRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<MissionDto>> UpdateStatusAsync(Guid id, UpdateMissionStatusRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<MissionDto>> ToggleAmaterasuAsync(Guid id, ToggleAmaterasuRequest? request = null, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
