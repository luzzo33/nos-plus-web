import alphaModal from './es/alphaModal.json';
import analysis from './es/analysis.json';
import apiKeys from './es/apiKeys.json';
import auth from './es/auth.json';
import common from './es/common.json';
import dashboard from './es/dashboard.json';
import docs from './es/docs.json';
import footer from './es/footer.json';
import holders from './es/holders.json';
import legal from './es/legal.json';
import monitor from './es/monitor.json';
import maintenance from './es/maintenance.json';
import nav from './es/nav.json';
import blog from './es/blog.json';
import openapi from './es/openapi.json';
import price from './es/price.json';
import raydium from './es/raydium.json';
import seo from './es/seo.json';
import settings from './es/settings.json';
import sentiment from './es/sentiment.json';
import stakersUnstakers from './es/stakersUnstakers.json';
import stakingDapp from './es/stakingDapp.json';
import stakingDetails from './es/stakingDetails.json';
import status from './es/status.json';
import volume from './es/volume.json';
import widgets from './es/widgets.json';

const navWithChangelog = {
  ...nav,
  changelog: nav.changelog ?? 'Registro de cambios',
  descriptions: {
    ...nav.descriptions,
    changelog:
      nav.descriptions?.changelog ??
      'Revisa las últimas versiones y actualizaciones de NOS.plus',
  },
};

const footerWithChangelogLink = {
  ...footer,
  links: {
    ...footer.links,
    changelog: footer.links?.changelog ?? 'Registro de cambios',
  },
};

const commonWithChangelogIntro = {
  ...common,
  changelogIntro:
    common.changelogIntro ??
    'Mantente al día con los últimos lanzamientos, correcciones y novedades de NOS.plus.',
};

const es = {
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
  status,
  volume,
  widgets,
};

export default es;
