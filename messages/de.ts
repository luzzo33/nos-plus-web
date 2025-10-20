import alphaModal from './de/alphaModal.json';
import analysis from './de/analysis.json';
import apiKeys from './de/apiKeys.json';
import auth from './de/auth.json';
import common from './de/common.json';
import dashboard from './de/dashboard.json';
import docs from './de/docs.json';
import footer from './de/footer.json';
import holders from './de/holders.json';
import legal from './de/legal.json';
import monitor from './de/monitor.json';
import maintenance from './de/maintenance.json';
import nav from './de/nav.json';
import blog from './de/blog.json';
import openapi from './de/openapi.json';
import price from './de/price.json';
import raydium from './de/raydium.json';
import seo from './de/seo.json';
import settings from './de/settings.json';
import sentiment from './de/sentiment.json';
import stakersUnstakers from './de/stakersUnstakers.json';
import stakingDapp from './de/stakingDapp.json';
import stakingDetails from './de/stakingDetails.json';
import stakingAnalysis from './de/stakingAnalysis.json';
import status from './de/status.json';
import volume from './de/volume.json';
import widgets from './de/widgets.json';

const navWithChangelog = {
  ...nav,
  changelog: nav.changelog ?? 'Changelog',
  descriptions: {
    ...nav.descriptions,
    changelog:
      nav.descriptions?.changelog ??
      'Neueste NOS.plus-Versionen und Updates ansehen',
  },
};

const footerWithChangelogLink = {
  ...footer,
  links: {
    ...footer.links,
    changelog: footer.links?.changelog ?? 'Changelog',
  },
};

const commonWithChangelogIntro = {
  ...common,
  changelogIntro:
    common.changelogIntro ??
    'Bleibe über die neuesten NOS.plus Releases, Fixes und Features informiert.',
};

const de = {
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

export default de;
