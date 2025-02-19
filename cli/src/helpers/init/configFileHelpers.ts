import { getLocationForJsonPath, parseWithPointers } from '@stoplight/yaml';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { findStoatConfigPath, getGitRoot } from '../pathHelpers';
import { GhJob } from './stoatActionHelpers';

const defaultStoatConfigFile =
  `
---
version: 1
enabled: true
#tasks:
#  your-unique-identifier:
#    metadata:
#      name: "Name of artifact you're hosting, such as Code Coverage Report"
#    static_hosting:
#      path: path/from/git/root/to/directory/to/host
#  job-runtime:
#    job_runtime: {}
`.trim() + '\n';

export function createConfigFile() {
  const configFilePath = findStoatConfigPath(process.cwd());

  if (fs.existsSync(configFilePath)) {
    console.warn(chalk.yellow(`Stoat config file already exists: ${configFilePath}`));
  } else {
    const stoatDirectory = path.join(getGitRoot(), '.stoat');
    if (!fs.existsSync(stoatDirectory)) {
      fs.mkdirSync(stoatDirectory);
    }

    fs.writeFileSync(configFilePath, defaultStoatConfigFile);
    console.log(`Stoat config file created at: ${configFilePath}`);
  }
}

export function addStoatActionToYaml(job: GhJob): string {
  const yamlStr = fs.readFileSync(job.workflowFile).toString();
  const yamlLines = yamlStr.split('\n');
  const parsed = parseWithPointers(yamlStr);
  const location = getLocationForJsonPath(parsed, ['jobs', job.name, 'steps']);

  let prefix = undefined;

  // the range includes the "steps:" line
  let firstPossibleListItemRowNumber = location!.range.start.line + 1;

  while (prefix === undefined) {
    if (yamlLines[firstPossibleListItemRowNumber].trim().startsWith('-')) {
      prefix = yamlLines[firstPossibleListItemRowNumber].split('-')[0];
    } else {
      firstPossibleListItemRowNumber++;
    }
  }

  yamlLines.splice(
    location!.range.end.line + 1,
    0,
    '',
    `${prefix}- name: Run Stoat Action`,
    `${prefix}  uses: stoat-dev/stoat-action@v0`,
    `${prefix}  if: always()`,
    ''
  );

  return yamlLines.join('\n');
}
