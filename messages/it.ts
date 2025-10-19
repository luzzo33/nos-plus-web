import alphaModal from './it/alphaModal.json';
import analysis from './it/analysis.json';
import apiKeys from './it/apiKeys.json';
import auth from './it/auth.json';
import common from './it/common.json';
import dashboard from './it/dashboard.json';
import docs from './it/docs.json';
import footer from './it/footer.json';
import holders from './it/holders.json';
import legal from './it/legal.json';
import monitor from './it/monitor.json';
import maintenance from './it/maintenance.json';
import nav from './it/nav.json';
import blog from './it/blog.json';
import openapi from './it/openapi.json';
import price from './it/price.json';
import raydium from './it/raydium.json';
import seo from './it/seo.json';
import settings from './it/settings.json';
import sentiment from './it/sentiment.json';
import stakersUnstakers from './it/stakersUnstakers.json';
import stakingDapp from './it/stakingDapp.json';
import stakingDetails from './it/stakingDetails.json';
import stakingAnalysis from './it/stakingAnalysis.json';
import status from './it/status.json';
import volume from './it/volume.json';
import widgets from './it/widgets.json';

const navWithChangelog = {
  ...nav,
  changelog: nav.changelog ?? 'Registro delle modifiche',
  descriptions: {
    ...nav.descriptions,
    changelog:
      nav.descriptions?.changelog ??
      'Consulta le ultime versioni e aggiornamenti di NOS.plus',
  },
};

const footerWithChangelogLink = {
  ...footer,
  links: {
    ...footer.links,
    changelog: footer.links?.changelog ?? 'Registro delle modifiche',
  },
};

const commonWithChangelogIntro = {
  ...common,
  changelogIntro:
    common.changelogIntro ??
    'Rimani aggiornato sugli ultimi rilasci, correzioni e novità di NOS.plus.',
};

const it = {
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

export default it;
