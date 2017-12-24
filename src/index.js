#!/usr/bin/env node
const program = require('commander')
const axios = require('axios')
const ora = require('ora')
const cfonts = require('cfonts')
const Table = require('cli-table2')
const colors = require('colors')
const humanize = require('humanize-plus')
const os = require('os')

const platform = os.platform() // linux, darwin, win32, sunos
const supportEmoji = platform !== 'darwin'
const list = val => val.split(',');

transpose = function(array, n) {
  var records = [];
  if (n > array.length) {
    return undefined;
  }
  var grouped = Math.floor(array.length / n);
  for(var j = 0; j < n; j++) {
    for(var i = 0; i < grouped; i++) {
      records[i * n + j] = (array[j * grouped + i]);
    }
  }
  return records;
}

program
  .version('0.0.9')
  .option('-c, --convert [currency]', 'Convert to your fiat currency', 'usd')
  .option('-f, --find [symbol]', 'Find specific coin data with coin symbol (can be a comma seperated list)', list, [])
  .option('-t, --top [index]', 'Show the top coins ranked from 1 - [index] according to the market cap', null)
  .option('-H, --humanize [enable]', 'Show market cap as a humanized number, default true', true)
  .option('-C, --columns [column number]', 'Splits results into N columns', '1')
  .parse(process.argv)

const convert = program.convert.toUpperCase()
const availableCurrencies = ['USD', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PKR', 'PLN', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'ZAR']
if (availableCurrencies.indexOf(convert) === -1) {
  return console.log('We cannot convert to your fiat currency.'.red)
}
const find = program.find
const top = !isNaN(program.top) && +program.top > 0 ? +program.top : (find.length > 0 ? 1500 : 10)
const columns = +program.columns
const defaultHeader = ['Rank', 'Coin', `Price (${convert})`, 'Change (24H)', 'Change (1H)', `Market Cap (${convert})`].map(title => title.yellow);
const humanizeIsEnabled = program.humanize !== 'false'
const table = new Table({
  chars: {
    'top': '-',
    'top-mid': '-',
    'top-left': '-',
    'top-right': '-',
    'bottom': '-',
    'bottom-mid': '-',
    'bottom-left': '-',
    'bottom-right': '-',
    'left': '║',
    'left-mid': '-' ,
    'mid': '-' ,
    'mid-mid': '-',
    'right': '║',
    'right-mid': '-',
    'middle': '│'
  },
  head: defaultHeader,
  colWidths: [6, 14, 15, 15, 15, 20]
})

cfonts.say('coinmon', {
  font: 'simple3d',
  align: 'left',
  colors: ['yellow'],
  background: 'Black',
  letterSpacing: 2,
  lineHeight: 1,
  space: true,
  maxLength: '0'
})
const spinner = ora('Loading data').start()
const sourceUrl = `https://api.coinmarketcap.com/v1/ticker/?limit=${top}&convert=${convert}`
axios.get(sourceUrl)
.then(function (response) {
  spinner.stop()
  const records = [];
  response.data
    .filter(record => {
      if (find.length > 0) {
        return find.some(keyword => record.symbol.toLowerCase() === keyword.toLowerCase())
      }
      return true
    })
    .map(record => {
      const percentChange24h = record.percent_change_24h
      const textChange24h = `${percentChange24h}%`
      const change24h = percentChange24h? (percentChange24h > 0 ? textChange24h.green : textChange24h.red) : 'NA'
      const percentChange1h = record.percent_change_1h
      const textChange1h = `${percentChange1h}%`
      const change1h = percentChange1h ? (percentChange1h > 0 ? textChange1h.green : textChange1h.red) : 'NA'
      const marketCap = record[`market_cap_${convert}`.toLowerCase()]
      const displayedMarketCap = humanizeIsEnabled ? humanize.compactInteger(marketCap, 3) : marketCap
      return [
        record.rank,
        `${supportEmoji ? '💰  ' : ''}${record.symbol}`,
        record[`price_${convert}`.toLowerCase()],
        change24h,
        change1h,
        displayedMarketCap
      ]
    })
    .forEach(record => records.push(record))
  if (records.length === 0) {
    console.log('We are not able to find coins matching your keywords'.red)
  } else {
    console.log(`Data source from coinmarketcap.com at ${new Date().toLocaleTimeString()}`)
    if (columns > 1) {
      for(var i = 1; i < columns; i++) {
        table.options.head = table.options.head.concat(defaultHeader);
      }
      var transposed = transpose(records, columns);
      var remainder = records.length % columns
      for(var i = 0; i < transposed.length; i+=columns) {
        table.push(transposed.slice(i, i+columns).reduce(function( a,rec ) { a.push(...rec); return a; }, []));
      }
      for(var i = 0; i < remainder; i++) {
        table.push(Array.from('-'.repeat(( columns - 1 ) * defaultHeader.length)).concat(records[transposed.length + i]))
      }
    } else {
      records.forEach(record => table.push(record))
    }
    console.log(table.toString())
  }
})
.catch(function (error) {
  spinner.stop()
  console.error('Coinmon is not working now. Please try again later.'.red)
})
