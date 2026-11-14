using Microsoft.Extensions.DependencyInjection;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Services;

namespace TsukuyomiFocus.Application;

public static class IoC
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddTransient<IProfileAppService, ProfileAppService>();
        services.AddTransient<IMissionAppService, MissionAppService>();
        services.AddTransient<ISessionAppService, SessionAppService>();
        services.AddTransient<IStatsAppService, StatsAppService>();

        return services;
    }
}
