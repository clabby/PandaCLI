const chalk = require('chalk');

const log = (prefix, msg) => {
  console.log(prefix + chalk.grey(': ') + chalk.reset(msg));
};

const info = msg => {
  log(chalk.cyan('INFO'), msg);
};

const success = msg => {
  log(chalk.green('SUCCESS'), msg);
};

const warning = msg => {
  log(chalk.yellow('WARNING'), msg);
};

const error = msg => {
  log(chalk.red('ERROR'), msg);
};

const debug = msg => {
  log(chalk.magenta('DEBUG'), msg);
};

const separator = () => console.log(chalk.grey('---------------'));


module.exports = { info, success, warning, error, debug, separator };
