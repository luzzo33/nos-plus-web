export * from './types';

import { PriceApiClient } from './price-client';
import { VolumeApiClient } from './volume-client';
import { SentimentApiClient } from './sentiment-client';
import { ForecastApiClient } from './forecast-client';
import { HoldersApiClient } from './holders-client';
import { DistributionApiClient } from './distribution-client';
import { FlowApiClient } from './flow-client';
import { RaydiumApiClient } from './raydium-client';
import { BalancesApiClient } from './balances-client';
import { StakersUnstakersApiClient } from './stakers-unstakers-client';
import { StakingApiClient } from './staking-client';
import { SentimentFeedbackApiClient } from './sentiment-feedback-client';
import { BlogApiClient } from './blog-client';
import { RichListApiClient } from './richlist-client';

import {
  ChartResponse,
  TableResponse,
  WidgetData,
  StatsResponse,
  VolumeChartResponse,
  VolumeTableResponse,
  VolumeWidgetData,
  VolumeStatsResponse,
  SentimentChartResponse,
  SentimentWidgetData,
  ForecastChartResponse,
  ForecastWidgetData,
  TimeRange,
  ForecastRange,
  Interval,
  Currency,
  HoldersChartResponse,
  HoldersTableResponse,
  HoldersWidgetData,
  HoldersStatsResponse,
  DistributionChartResponse,
  DistributionTableResponse,
  DistributionWidgetData,
  DistributionStatsResponse,
  StakingWidgetResponse,
  StakingChartResponse,
  StakingStatsResponse,
  StakingTableResponse,
  StakingEarningsResponse,
  StakingEarningsEventsResponse,
  StakingJobsResponse,
  StakingJobResponse,
  RichListChartResponse,
  RichListTableResponse,
  RichListWidgetData,
  RichListStatsResponse,
  RichListRange,
  ApiMeta,
} from './types';
import type { RaydiumWidgetData } from './types';

class NOSApiClient {
  private priceClient: PriceApiClient;
  private volumeClient: VolumeApiClient;
  private sentimentClient: SentimentApiClient;
  private forecastClient: ForecastApiClient;
  private holdersClient: HoldersApiClient;
  private distributionClient: DistributionApiClient;
  private flowClient: FlowApiClient;
  private raydiumClient: RaydiumApiClient;
  private balancesClient: BalancesApiClient;
  private richListClient: RichListApiClient;
  private stakersUnstakersClient: StakersUnstakersApiClient;
  private stakingClient: StakingApiClient;
  private sentimentFeedbackClient: SentimentFeedbackApiClient;
  private blogClient: BlogApiClient;

  constructor() {
    this.priceClient = new PriceApiClient();
    this.volumeClient = new VolumeApiClient();
    this.sentimentClient = new SentimentApiClient();
    this.forecastClient = new ForecastApiClient();
    this.holdersClient = new HoldersApiClient();
    this.distributionClient = new DistributionApiClient();
    this.flowClient = new FlowApiClient();
    this.raydiumClient = new RaydiumApiClient();
    this.balancesClient = new BalancesApiClient();
    this.richListClient = new RichListApiClient();
    this.stakersUnstakersClient = new StakersUnstakersApiClient(this.balancesClient);
    this.stakingClient = new StakingApiClient();
    this.sentimentFeedbackClient = new SentimentFeedbackApiClient();
    this.blogClient = new BlogApiClient();
  }

  async getChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval;
    currency?: Currency;
    indicators?: string;
  }): Promise<ChartResponse> {
    return this.priceClient.getChartData(params);
  }

  async getTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
    currency?: Currency;
  }): Promise<TableResponse> {
    return this.priceClient.getTableData(params);
  }

  async getWidgetData(
    currency: Currency = 'usd',
  ): Promise<{ success: boolean; widget: WidgetData; meta: ApiMeta }> {
    return this.priceClient.getWidgetData(currency);
  }

  async getStats(params: { range?: TimeRange; currency?: Currency }): Promise<StatsResponse> {
    return this.priceClient.getStats(params);
  }

  async getVolumeChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval;
    cumulative?: boolean;
    ma?: string;
  }): Promise<VolumeChartResponse> {
    return this.volumeClient.getChartData(params);
  }

  async getVolumeTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
    currency?: Currency;
  }): Promise<VolumeTableResponse> {
    return this.volumeClient.getTableData(params);
  }

  async getVolumeWidgetData(): Promise<{
    success: boolean;
    widget: VolumeWidgetData;
    meta: ApiMeta;
  }> {
    return this.volumeClient.getWidgetData();
  }

  async getVolumeStats(params: { range?: TimeRange }): Promise<VolumeStatsResponse> {
    return this.volumeClient.getStats(params);
  }

  async getSentimentChartData(params: {
    range?: TimeRange;
    includeComponents?: boolean;
    ma?: string;
  }): Promise<SentimentChartResponse> {
    return this.sentimentClient.getChartData(params);
  }

  async getSentimentTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, unknown>> {
    return this.sentimentClient.getTableData(params);
  }

  async getSentimentWidgetData(): Promise<{
    success: boolean;
    widget: SentimentWidgetData;
    meta: ApiMeta;
  }> {
    return this.sentimentClient.getWidgetData();
  }

  async getSentimentStats(params: { range?: TimeRange }): Promise<Record<string, unknown>> {
    return this.sentimentClient.getStats(params);
  }

  async getForecastChartData(params: {
    range?: ForecastRange;
    startDate?: string;
    endDate?: string;
    interval?: string;
    includeHistorical?: boolean;
    indicators?: boolean;
  }): Promise<ForecastChartResponse> {
    return this.forecastClient.getChartData(params);
  }

  async getForecastTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, unknown>> {
    return this.forecastClient.getTableData(params);
  }

  async getForecastWidgetData(): Promise<{
    success: boolean;
    widget: ForecastWidgetData;
    meta: ApiMeta;
  }> {
    return this.forecastClient.getWidgetData();
  }

  async getForecastStats(params: { range?: TimeRange }): Promise<Record<string, unknown>> {
    return this.forecastClient.getStats(params);
  }

  async getHoldersChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval | string;
    ma?: string;
  }): Promise<HoldersChartResponse> {
    return this.holdersClient.getChartData(params);
  }

  async getHoldersTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
  }): Promise<HoldersTableResponse> {
    return this.holdersClient.getTableData(params);
  }

  async getHoldersWidgetData(): Promise<{
    success: boolean;
    widget: HoldersWidgetData;
    meta: ApiMeta;
  }> {
    return this.holdersClient.getWidgetData();
  }

  async getHoldersStats(params: { range?: TimeRange }): Promise<HoldersStatsResponse> {
    return this.holdersClient.getStats(params);
  }

  async getRichListChartData(params: {
    range?: RichListRange;
    startDate?: string;
    endDate?: string;
    interval?: string;
    top?: number;
    address?: string;
  }): Promise<RichListChartResponse> {
    return this.richListClient.getChartData(params);
  }

  async getRichListTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    date?: string;
    maxRank?: number;
    range?: string;
    top?: number;
  }): Promise<RichListTableResponse> {
    return this.richListClient.getTableData(params);
  }

  async getRichListWidgetData(): Promise<{
    success: boolean;
    widget: RichListWidgetData;
    meta?: ApiMeta;
  }> {
    return this.richListClient.getWidgetData();
  }

  async getRichListStats(params: { range?: RichListRange }): Promise<RichListStatsResponse> {
    return this.richListClient.getStats(params);
  }

  async getDistributionWidgetData(): Promise<{
    success: boolean;
    widget: DistributionWidgetData;
    meta: ApiMeta;
  }> {
    return this.distributionClient.getWidgetData();
  }

  async getDistributionChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval | string;
  }): Promise<DistributionChartResponse> {
    return this.distributionClient.getChartData(params);
  }

  async getDistributionTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
  }): Promise<DistributionTableResponse> {
    return this.distributionClient.getTableData(params);
  }

  async getDistributionStats(params: { range?: TimeRange }): Promise<DistributionStatsResponse> {
    return this.distributionClient.getStats(params);
  }

  async traceFlow(params: Parameters<FlowApiClient['trace']>[0]) {
    return this.flowClient.trace(params);
  }

  async getFlowCache(key: string, opts?: { stale?: boolean }) {
    return this.flowClient.getCache(key, opts);
  }

  async getFlowJob(key: string) {
    return this.flowClient.getJob(key);
  }

  async getRaydiumWidgetData(): Promise<{
    success: boolean;
    widget: RaydiumWidgetData;
    meta?: ApiMeta;
  }> {
    return this.raydiumClient.getWidgetAll();
  }

  async getRaydiumWidgetDataForRange(
    range: string,
  ): Promise<{ success: boolean; widget: RaydiumWidgetData; meta?: ApiMeta }> {
    return this.raydiumClient.getWidget(range);
  }

  async getRaydiumChart(
    params: {
      range?: string;
      interval?: string;
      metric?: string;
      ma?: string;
      include?: string;
    } = {},
  ) {
    return this.raydiumClient.getChart(params);
  }

  async getRaydiumStats(range?: string) {
    return this.raydiumClient.getStats(range);
  }

  async getRaydiumTable(
    params: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ) {
    return this.raydiumClient.getTable(params);
  }

  async getStakersUnstakersWidget() {
    return this.stakersUnstakersClient.getWidget();
  }

  async getStakersUnstakersChart(params: Parameters<StakersUnstakersApiClient['getChart']>[0]) {
    return this.stakersUnstakersClient.getChart(params);
  }

  async getStakersUnstakersTable(params: Parameters<StakersUnstakersApiClient['getTable']>[0]) {
    return this.stakersUnstakersClient.getTable(params);
  }

  async getStakersUnstakersStats(range?: TimeRange) {
    return this.stakersUnstakersClient.getStats(range);
  }

  async getBalancesAccountsWidget() {
    return this.balancesClient.getAccountsWidget();
  }
  async getBalancesAccountsChart(params: Parameters<BalancesApiClient['getAccountsChart']>[0]) {
    return this.balancesClient.getAccountsChart(params);
  }
  async getBalancesAccountsTable(params: Parameters<BalancesApiClient['getAccountsTable']>[0]) {
    return this.balancesClient.getAccountsTable(params);
  }
  async getBalancesAccountsStats(range?: TimeRange) {
    return this.balancesClient.getAccountsStats(range);
  }

  async getBalancesContractWidget() {
    return this.balancesClient.getContractWidget();
  }
  async getBalancesContractChart(params: Parameters<BalancesApiClient['getContractChart']>[0]) {
    return this.balancesClient.getContractChart(params);
  }
  async getBalancesContractTable(params: Parameters<BalancesApiClient['getContractTable']>[0]) {
    return this.balancesClient.getContractTable(params);
  }
  async getBalancesContractStats(range?: TimeRange) {
    return this.balancesClient.getContractStats(range);
  }

  async getStakingWidget(): Promise<StakingWidgetResponse> {
    return this.stakingClient.getWidget();
  }
  async getStakingChart(
    params: Parameters<StakingApiClient['getChart']>[0],
  ): Promise<StakingChartResponse> {
    return this.stakingClient.getChart(params);
  }
  async getStakingStats(range?: string): Promise<StakingStatsResponse> {
    return this.stakingClient.getStats(range);
  }
  async getStakingTable(
    params: Parameters<StakingApiClient['getTable']>[0],
  ): Promise<StakingTableResponse> {
    return this.stakingClient.getTable(params);
  }
  async getStakingEarningsEvents(
    params: Parameters<StakingApiClient['getEarningsEvents']>[0],
  ): Promise<StakingEarningsEventsResponse> {
    return this.stakingClient.getEarningsEvents(params);
  }
  async getStakingEarnings(params: Parameters<StakingApiClient['getEarnings']>[0]): Promise<StakingEarningsResponse> {
    return this.stakingClient.getEarnings(params);
  }
  async refreshStakingEarnings(
    params: Parameters<StakingApiClient['refreshEarnings']>[0],
  ): Promise<StakingEarningsResponse> {
    return this.stakingClient.refreshEarnings(params);
  }
  async getStakingJobs(): Promise<StakingJobsResponse> {
    return this.stakingClient.listJobs();
  }
  async getStakingJob(jobId: string): Promise<StakingJobResponse> {
    return this.stakingClient.getJob(jobId);
  }
  async createStakingJob(
    params: Parameters<StakingApiClient['createJob']>[0],
  ): Promise<StakingJobResponse> {
    return this.stakingClient.createJob(params);
  }

  async submitSentimentVote(sentiment: 'bullish' | 'bearish') {
    return this.sentimentFeedbackClient.submitVote(sentiment);
  }

  async getSentimentFeedbackStats(params?: { period?: '24h' | '7d' | '30d' }) {
    return this.sentimentFeedbackClient.getStats(params);
  }

  getSentimentVoteStatus() {
    return this.sentimentFeedbackClient.getUserVoteStatus();
  }

  storeSentimentVote(sentiment: 'bullish' | 'bearish') {
    return this.sentimentFeedbackClient.storeUserVote(sentiment);
  }

  clearSentimentVote() {
    return this.sentimentFeedbackClient.clearUserVote();
  }

  async getBlogPosts(language?: string) {
    return this.blogClient.getPosts(language);
  }

  async getBlogPost(slug: string, language?: string) {
    return this.blogClient.getPost(slug, language);
  }
}

export const apiClient = new NOSApiClient();
