import React, { useState, useEffect } from 'react';
import { Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Typography, CircularProgress, Box, Tooltip, Snackbar, Grid, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    background: {
      default: '#303030',
    },
  },
});

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  boxShadow: theme.shadows[1],
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:57000' : '/api';

function App() {
  const [ultimosPix, setUltimosPix] = useState([]);
  const [lastFetched, setLastFetched] = useState('');
  const [submissionResponse, setSubmissionResponse] = useState('');
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [showWarning, setShowWarning] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const fetchUltimosPix = async () => {
    try {
      setSubmissionResponse('');
      const response = await fetch(`${baseUrl}/recentPix`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setUltimosPix(data.transactions || []);
      setLastFetched(data.lastFetched);
      if (data.transactions.length > 0) {
        handleCountdown();
      }
    } catch (error) {
      console.error('Error fetching last PIX:', error);
      setSubmissionResponse('Erro ao recuperar dados. Por favor tente novamente mais tarde.');
      setTimeout(() => setOpenSnackbar(false), 5000);
      setOpenSnackbar(true);
      setUltimosPix([]);
    }
  };

  const handleCountdown = () => {
    setButtonDisabled(true);
    setShowWarning(false);
    setCountdown(20);
    const interval = setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(interval);
          setButtonDisabled(false);
          return 20;
        }
        return prevCountdown - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    fetchUltimosPix();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ mt: 4, bgcolor: 'background.default', color: '#fff', borderRadius: 2, padding: 3 }}>
        <Typography variant="h4" gutterBottom>
          Últimos PIXs que caíram na conta
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Tooltip title={<Typography>Aguarde {countdown} segundos para atualizar novamente</Typography>}>
              <span>
              <IconButton
                onClick={() => {
                  if (buttonDisabled) {
                    setShowWarning(true);
                    setTimeout(() => setShowWarning(false), 5000);
                  } else {
                    fetchUltimosPix();
                  }
                }}
                disabled={buttonDisabled}
              >
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshIcon sx={{ color: 'white', fontSize: '2rem' }} />
                  {buttonDisabled && (
                    <CircularProgress
                      size={40}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        position: 'absolute'
                      }}
                    />
                  )}
                </Box>
              </IconButton>
              </span>
            </Tooltip>
          </Grid>
          <Grid item>
            <Typography variant="body2" fontSize={20}>
              {lastFetched && `Atualizado última vez às: ${lastFetched}`}
            </Typography>
          </Grid>
        </Grid>
        {submissionResponse && <Typography color="primary" sx={{ my: 1 }}>{submissionResponse}</Typography>}
        {showWarning && <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)} message={`Button is locked. Please wait ${countdown} seconds.`} />}
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome ou CPF/CNPJ</TableCell>
                <TableCell>Valor do PIX</TableCell>
                <TableCell>Data de recebimento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ultimosPix.length > 0 ? (
                ultimosPix.map((pix, index) => (
                  <StyledTableRow key={index}>
                    <TableCell component="th" scope="row">
                      {pix.name}
                    </TableCell>
                    <TableCell>{`R$ ${pix.value}`}</TableCell>
                    <TableCell>{pix.insertionDate}</TableCell>
                  </StyledTableRow>
                ))
              ) : (
                <StyledTableRow>
                  <TableCell colSpan={3} align="center">No data available</TableCell>
                </StyledTableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </ThemeProvider>
  );
}

export default App;
