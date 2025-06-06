import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Box } from '@mui/material';

import Intervals from './Intervals';

const styles = {
    tapperGrid: {
        margin: 0,
        boxShadow: 'none',
        borderRadius: 0,
        alignItems: 'center',
        p: '10px',
        '@media (max-width:570px)': {
            margin: 0,
            boxShadow: 'none',
            borderRadius: 0,
            alignItems: 'center',
            padding: '0px 10px 0 60px',
        },
    },
    tapperInside: {
        overflow: 'hidden',
        height: '100%',
        flexGrow: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
};

class IntervalsContainer extends Component {
    constructor(props) {
        super(props);
        this.tapperRef = React.createRef();
        this.state = {
            intervalsWidth: 0,
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.updateWindowDimensions);
        this.updateWindowDimensions();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.range !== this.props.range) {
            this.updateWindowDimensions();
        }
        if (prevProps.windowWidth !== this.props.windowWidth) {
            this.updateWindowDimensions();
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    updateWindowDimensions = () => {
        const w = this.tapperRef.current?.getBoundingClientRect().width;
        this.setState({
            intervalsWidth: w || 30,
        });
    };

    render() {
        const { type, theme, range, intervals, minMax } = this.props;
        const intervalsWidth = this.tapperRef.current?.getBoundingClientRect().width;
        if (intervalsWidth && intervalsWidth !== this.state.intervalsWidth) {
            this.updateWidth =
                this.updateWidth ||
                setTimeout(() => {
                    this.updateWidth = null;
                    this.updateWindowDimensions();
                }, 100);
        }
        // console.log(this.state.intervalsWidth);
        return (
            <Box
                className="m-1 h-100"
                sx={styles.tapperGrid}
                style={{ backgroundColor: theme.palette.background.default, padding: 0 }}
            >
                <div
                    id={`${this.props.id}-tapper-inside`}
                    ref={this.tapperRef}
                    style={{
                        ...styles.tapperInside,
                        padding: 0,
                        width: '100%',
                    }}
                >
                    {this.props.intervalsWidth || this.state.intervalsWidth ? (
                        <Intervals
                            id={this.props.id}
                            data={intervals}
                            onChange={this.props.onChange}
                            theme={theme}
                            type={type}
                            range={range}
                            intervalsWidth={this.props.intervalsWidth || this.state.intervalsWidth}
                            minMax={minMax}
                            t={this.props.t}
                        />
                    ) : null}
                </div>
            </Box>
        );
    }
}

IntervalsContainer.propTypes = {
    intervals: PropTypes.array,
    onChange: PropTypes.func,
    range: PropTypes.number,
    theme: PropTypes.object,
    type: PropTypes.string,
    intervalsWidth: PropTypes.number,
    id: PropTypes.string.isRequired,
    minMax: PropTypes.object,
    t: PropTypes.func.isRequired,
};

export default IntervalsContainer;
