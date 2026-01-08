#!/usr/bin/env node
/**
 * Re/curse - CLI Interface
 * Website archiver using Playwright
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import { Archiver } from './archiver.js';
// ASCII art banner with line separators
const banner = `
${chalk.hex('#8b5cf6')('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${chalk.hex('#22d3ee').bold('  ██████╗ ███████╗')}${chalk.white('/')}${chalk.hex('#a78bfa').bold('██████╗██╗   ██╗██████╗ ███████╗███████╗')}
${chalk.hex('#22d3ee').bold('  ██╔══██╗██╔════╝')}${chalk.white(' ')}${chalk.hex('#a78bfa').bold('██╔════╝██║   ██║██╔══██╗██╔════╝██╔════╝')}
${chalk.hex('#22d3ee').bold('  ██████╔╝█████╗  ')}${chalk.white(' ')}${chalk.hex('#a78bfa').bold('██║     ██║   ██║██████╔╝███████╗█████╗  ')}
${chalk.hex('#22d3ee').bold('  ██╔══██╗██╔══╝  ')}${chalk.white(' ')}${chalk.hex('#a78bfa').bold('██║     ██║   ██║██╔══██╗╚════██║██╔══╝  ')}
${chalk.hex('#22d3ee').bold('  ██║  ██║███████╗')}${chalk.white(' ')}${chalk.hex('#a78bfa').bold('╚██████╗╚██████╔╝██║  ██║███████║███████╗')}
${chalk.hex('#22d3ee').bold('  ╚═╝  ╚═╝╚══════╝')}${chalk.white(' ')}${chalk.hex('#a78bfa').bold(' ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝')}
${chalk.hex('#64748b')('                    Website Archiver')}
${chalk.hex('#8b5cf6')('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
`;

console.log(banner);

program
    .name('Re/curse')
    .description('Recursively crawl and archive websites for offline use')
    .version('1.0.0')
    .argument('<url>', 'Starting URL to archive')
    .option('-d, --depth <number>', 'Maximum crawl depth', '3')
    .option('-p, --pages <number>', 'Maximum pages to download', '50')
    .option('-o, --output <path>', 'Output directory or ZIP file', './archive')
    .option('-c, --cookies <file>', 'Path to cookies JSON file (exported from browser)')
    .option('--no-images', 'Skip downloading images')
    .option('--no-css', 'Skip downloading CSS')
    .option('--no-js', 'Skip downloading JavaScript')
    .option('--delay <ms>', 'Delay between requests in milliseconds', '500')
    .option('--timeout <ms>', 'Page load timeout in milliseconds', '30000')
    .option('--headless', 'Run browser in headless mode', true)
    .option('--visible', 'Show browser window (not headless)')
    .action(async (url, options) => {
        const spinner = ora('Initializing...').start();

        try {
            // Load cookies from file if provided
            let cookies = [];
            if (options.cookies) {
                try {
                    const cookieData = await fs.readFile(options.cookies, 'utf-8');
                    cookies = JSON.parse(cookieData);
                    spinner.text = chalk.hex('#a78bfa')(`Loaded ${cookies.length} cookies from ${options.cookies}`);
                } catch (e) {
                    spinner.warn(chalk.hex('#fbbf24')(`Failed to load cookies: ${e.message}`));
                }
            }

            const config = {
                startUrl: url,
                maxDepth: parseInt(options.depth),
                maxPages: parseInt(options.pages),
                outputPath: options.output,
                includeAssets: {
                    images: options.images !== false,
                    css: options.css !== false,
                    js: options.js !== false
                },
                delay: parseInt(options.delay),
                timeout: parseInt(options.timeout),
                headless: !options.visible,
                cookies: cookies
            };

            spinner.text = `Starting crawl of ${chalk.cyan(url)}`;

            const archiver = new Archiver(config);

            archiver.on('page', (data) => {
                spinner.text = `[${data.downloaded}/${data.discovered}] ${chalk.gray(data.url.substring(0, 60))}`;
            });

            archiver.on('error', (err) => {
                spinner.warn(chalk.yellow(`Error: ${err.message}`));
                spinner.start();
            });

            const result = await archiver.run();

            spinner.succeed(chalk.green(`Archive complete!`));

            console.log(`
${chalk.bold('Results:')}
  Pages:     ${chalk.cyan(result.pages)} downloaded
  Assets:    ${chalk.cyan(result.assets)} files
  Size:      ${chalk.cyan(formatBytes(result.totalBytes))}
  Output:    ${chalk.cyan(result.outputPath)}
  Duration:  ${chalk.cyan((result.duration / 1000).toFixed(1))}s
`);

        } catch (error) {
            spinner.fail(chalk.red(`Failed: ${error.message}`));
            console.error(error.stack);
            process.exit(1);
        }
    });

program.parse();

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
