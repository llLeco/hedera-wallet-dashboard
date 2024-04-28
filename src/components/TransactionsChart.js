import React from 'react';
import ReactApexChart from 'react-apexcharts';

const TransactionsChart = ({ data, isLoading }) => {
    // Return null if data is not available or loading
    if (!data || isLoading) {
        return null;
    }

    // Extracting necessary data for chart
    const tokens = Object.keys(data); // Extracting all tokens
    const timestamps = {}; // Object to hold timestamps for each token
    const amounts = {}; // Object to hold amounts for each token

    // Iterate over each token
    tokens.forEach(token => {
        timestamps[token] = data[token].map(transaction => new Date(transaction.consensus_timestamp * 1000).toLocaleDateString());
        amounts[token] = data[token].map(transaction => transaction.amount.toFixed(0));
    });

    // Configuring the chart options
    const options = {
        chart: {
            type: 'bar',
            height: 350,
            stacked: true, // Enable stacking
        },
        plotOptions: {
            bar: {
                horizontal: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: timestamps[tokens[0]], // Assuming all tokens have the same timestamps
            title: {
                text: 'Date',
            },
        },
        yaxis: {
            title: {
                text: 'Amount',
            },
        },
    };

    // Configuring the chart series
    const series = Object.keys(amounts).map(token => ({
        name: token,
        data: amounts[token],
    }));

    return (
        <div id="chart">
            <ReactApexChart options={options} series={series} type="bar" height={350} />
        </div>
    );
};

export default TransactionsChart;
