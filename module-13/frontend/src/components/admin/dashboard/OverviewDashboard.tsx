import React, { useMemo } from 'react';
import { formatEther } from 'viem';
import { 
  useCasinoDashboard, 
  useActivityFeed, 
  useDailyPerformance,
  useActivePlayers24h,
  useReelDistribution24h,
  formatGraphQLError 
} from '../../../hooks/admin/useGraphQLQueries';
import MetricCard from './MetricCard';
import ActivityFeed from './ActivityFeed';
import QuickStats from './QuickStats';
import ReelDistribution from './ReelDistribution';
import { 
  Users as UsersIcon, 
  DollarSign as DollarSignIcon, 
  TrendingUp as TrendingUpIcon, 
  Gamepad2 as Gamepad2Icon, 
  Trophy as TrophyIcon,
  AlertCircle as AlertCircleIcon,
  BarChart3 as BarChart3Icon,
  Coins as CoinsIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import type { DailySnapshot } from '../../../graphql/generated/types';

const OverviewDashboard: React.FC = () => {
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useCasinoDashboard();
  const { data: activityData, loading: activityLoading } = useActivityFeed();
  const { data: performanceData, loading: performanceLoading, error: performanceError } = useDailyPerformance();
  const { count: activePlayers24h, loading: activePlayers24hLoading } = useActivePlayers24h();
  const { reelCounts, totalSpins: reelSpins24h, loading: reelStatsLoading } = useReelDistribution24h();

  // Format numbers
  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCHIPS = (value: string, decimals: number = 0): string => {
    const chips = parseFloat(formatEther(BigInt(value)));
    // Handle -0 case
    if (chips === 0 || Object.is(chips, -0)) return '0';
    // If decimals specified, use fixed decimals
    if (decimals > 0) return chips.toFixed(decimals);
    return formatNumber(chips);
  };

  const formatETH = (value: string): string => {
    const eth = parseFloat(formatEther(BigInt(value)));
    // Handle -0 case
    if (eth === 0 || Object.is(eth, -0)) return '0.0000';
    // Show more decimals for ETH since values are small
    if (Math.abs(eth) < 0.01) return eth.toFixed(6);
    if (Math.abs(eth) < 1) return eth.toFixed(4);
    return eth.toFixed(4);
  };

  // Calculate 24h changes
  const calculate24hChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Log data issues for debugging
  React.useEffect(() => {
    if (dashboardData?.casinoMetrics && process.env.NODE_ENV === 'development') {
      const metrics = dashboardData.casinoMetrics;
      
      if (parseInt(metrics.totalSpins) > 0) {
        if (parseInt(metrics.totalHouseFees) === 0) {
          console.warn('CasinoMetrics: totalHouseFees is 0 despite having spins');
        }
        if (parseInt(metrics.activePlayers24h) === 0 && activePlayers24h > 0) {
          console.warn('CasinoMetrics: activePlayers24h in subgraph is 0 but query shows', activePlayers24h, 'active players');
        }
      }
    }
  }, [dashboardData, activePlayers24h]);

  // Prepare chart data with proper typing
  // Data comes in ascending order now, take last 7 days if more are available
  const chartData = useMemo(() => {
    if (!performanceData?.dailySnapshots?.length) {
      return [];
    }
    
    const snapshots = performanceData.dailySnapshots;
    
    // Take last 7 days if we have more than 7
    const recentSnapshots = snapshots.length > 7 
      ? snapshots.slice(-7) 
      : snapshots;
    
    return recentSnapshots.map((day: DailySnapshot) => ({
      date: format(new Date(parseInt(day.date) * 1000), 'MMM d'),
      spins: parseInt(day.spinsCount),
      // Revenue is houseFees + vrfMarkup (both in ETH)
      revenue: parseFloat(formatEther(BigInt(day.houseFees))) + parseFloat(formatEther(BigInt(day.vrfMarkup))),
      profit: parseFloat(formatEther(BigInt(day.netProfit))),
      players: parseInt(day.uniquePlayers),
    }));
  }, [performanceData]);

  if (dashboardError) {
    return (
      <div className="p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
          <AlertCircleIcon className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-300">{formatGraphQLError(dashboardError)}</p>
          <p className="text-sm text-gray-400 mt-2">Make sure your local Graph node is running</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.casinoMetrics;
  const todayStats = dashboardData?.dailySnapshots?.[0];
  const recentJackpots = dashboardData?.jackpotWins || [];

  // Use the real 24h active players count
  const activePlayersDisplay = activePlayers24h.toString();

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Spins"
          value={metrics ? formatNumber(metrics.totalSpins) : '0'}
          subtitle="All-time spins"
          change={todayStats ? calculate24hChange(parseInt(todayStats.spinsCount), 0) : 0}
          changeLabel="24h"
          icon={<Gamepad2Icon size={24} />}
          color="blue"
          loading={dashboardLoading}
        />
        
        <MetricCard
          title="Active Players (24h)"
          value={formatNumber(activePlayersDisplay)}
          subtitle={`${metrics ? formatNumber(metrics.uniquePlayers) : '0'} total players`}
          icon={<UsersIcon size={24} />}
          color="green"
          loading={dashboardLoading || activePlayers24hLoading}
        />
        
        <MetricCard
          title="Net Profit"
          value={metrics ? `${formatETH(metrics.netProfit)} ETH` : '0.0000 ETH'}
          subtitle={`${metrics && parseFloat(metrics.totalRevenue) > 0 ? parseFloat(metrics.profitMargin).toFixed(2) : '0.00'}% margin`}
          change={todayStats ? parseFloat(formatEther(BigInt(todayStats.netProfit))) : 0}
          changeLabel="today"
          icon={<DollarSignIcon size={24} />}
          color="yellow"
          loading={dashboardLoading}
        />
        
        <MetricCard
          title="Prize Pool"
          value={metrics ? `${formatCHIPS(metrics.currentPrizePool, 2)} CHIPS` : '0.00 CHIPS'}
          subtitle="Current jackpot"
          icon={<TrophyIcon size={24} />}
          color="purple"
          loading={dashboardLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <BarChart3Icon size={20} />
            <span>7-Day Performance {chartData.length > 0 && `(${chartData.length} days)`}</span>
          </h3>
          {performanceLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <BarChart3Icon size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">No data available yet</p>
                <p className="text-sm mt-2">Data will appear as players use the casino</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Area type="monotone" dataKey="spins" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Spins" />
                <Area type="monotone" dataKey="players" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Players" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUpIcon size={20} />
            <span>Revenue & Profit</span>
          </h3>
          {performanceLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <TrendingUpIcon size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">No revenue data yet</p>
                <p className="text-sm mt-2">Revenue will be tracked as players make bets</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value: number) => `${value.toFixed(6)} ETH`}
                />
                <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} name="Revenue (ETH)" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit (ETH)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <CoinsIcon size={20} />
          <span>Revenue & Costs Breakdown (ETH)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">House Fees</p>
            <p className="text-xl font-semibold text-green-400">{metrics ? formatETH(metrics.totalHouseFees) : '0.0000'} ETH</p>
            <p className="text-xs text-gray-500 mt-1">5% on all bets</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">VRF Markup</p>
            <p className="text-xl font-semibold text-green-400">{metrics ? formatETH(metrics.totalVRFMarkup) : '0.0000'} ETH</p>
            <p className="text-xs text-gray-500 mt-1">15% on VRF costs</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Costs</p>
            <p className="text-xl font-semibold text-red-400">{metrics ? formatETH(metrics.totalCosts) : '0.0000'} ETH</p>
            <p className="text-xs text-gray-500 mt-1">VRF + Jackpots paid</p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Activity Feed and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed (2 cols) */}
        <div className="lg:col-span-2">
          <ActivityFeed 
            recentSpins={activityData?.recentSpins || []}
            bigWinsToday={activityData?.bigWinsToday || []}
            loading={activityLoading}
          />
        </div>

        {/* Quick Stats (1 col) */}
        <div className="space-y-6">
          <QuickStats
            totalBets={metrics?.totalBetsVolume}
            totalPayouts={metrics?.totalPayoutsVolume}
            contractBalance={metrics?.contractETHBalance}
            chipsSupply={metrics?.totalChipsSupply}
            recentJackpots={recentJackpots}
            loading={dashboardLoading}
          />
          
          {/* Reel Distribution Chart */}
          <ReelDistribution 
            reelCounts={reelCounts}
            totalSpins={reelSpins24h}
            loading={reelStatsLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;