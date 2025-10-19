import alphaModal from './zh/alphaModal.json';
import analysis from './zh/analysis.json';
import apiKeys from './zh/apiKeys.json';
import auth from './zh/auth.json';
import common from './zh/common.json';
import dashboard from './zh/dashboard.json';
import docs from './zh/docs.json';
import footer from './zh/footer.json';
import holders from './zh/holders.json';
import legal from './zh/legal.json';
import monitor from './zh/monitor.json';
import maintenance from './zh/maintenance.json';
import nav from './zh/nav.json';
import blog from './zh/blog.json';
import openapi from './zh/openapi.json';
import price from './zh/price.json';
import raydium from './zh/raydium.json';
import seo from './zh/seo.json';
import settings from './zh/settings.json';
import sentiment from './zh/sentiment.json';
import stakersUnstakers from './zh/stakersUnstakers.json';
import stakingDapp from './zh/stakingDapp.json';
import stakingDetails from './zh/stakingDetails.json';
import stakingAnalysis from './zh/stakingAnalysis.json';
import status from './zh/status.json';
import volume from './zh/volume.json';
import widgets from './zh/widgets.json';

const navWithChangelog = {
  ...nav,
  changelog: nav.changelog ?? '更新日志',
  descriptions: {
    ...nav.descriptions,
    changelog:
      nav.descriptions?.changelog ??
      '查看最新的 NOS.plus 版本与更新',
  },
};

const footerWithChangelogLink = {
  ...footer,
  links: {
    ...footer.links,
    changelog: footer.links?.changelog ?? '更新日志',
  },
};

const commonWithChangelogIntro = {
  ...common,
  changelogIntro:
    common.changelogIntro ??
    '及时了解 NOS.plus 最新的发布、修复和功能更新。',
};

const zh = {
  alphaModal,
  analysis,
  apiKeys,
  auth,
  common: commonWithChangelogIntro,
  dashboard,
  docs,
  footer: footerWithChangelogLink,
  holders,
  legal,
  monitor,
  maintenance,
  nav: navWithChangelog,
  blog,
  openapi,
  price,
  raydium,
  seo,
  settings,
  sentiment,
  stakersUnstakers,
  stakingDapp,
  stakingDetails,
  stakingAnalysis,
  status,
  volume,
  widgets,
};

export default zh;
