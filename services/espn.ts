
import { Game } from '../types';

export const SUPPORTED_LEAGUES = [
  { id: 'all', name: 'Todas as Ligas (Global)', slug: 'soccer/all' },
  { id: 'por.1', name: 'Primeira Liga (Portugal)', slug: 'soccer/por.1' },
  { id: 'por.taca', name: 'Taça de Portugal', slug: 'soccer/por.taca.portugal' },
  { id: 'eng.1', name: 'Premier League (Inglaterra)', slug: 'soccer/eng.1' },
  { id: 'eng.2', name: 'Championship (Inglaterra)', slug: 'soccer/eng.2' },
  { id: 'eng.3', name: 'League One (Inglaterra)', slug: 'soccer/eng.3' },
  { id: 'esp.1', name: 'La Liga (Espanha)', slug: 'soccer/esp.1' },
  { id: 'esp.2', name: 'La Liga 2 (Espanha)', slug: 'soccer/esp.2' },
  { id: 'ita.1', name: 'Serie A (Itália)', slug: 'soccer/ita.1' },
  { id: 'ita.2', name: 'Serie B (Itália)', slug: 'soccer/ita.2' },
  { id: 'ger.1', name: 'Bundesliga (Alemanha)', slug: 'soccer/ger.1' },
  { id: 'ger.2', name: 'Bundesliga 2 (Alemanha)', slug: 'soccer/ger.2' },
  { id: 'fra.1', name: 'Ligue 1 (França)', slug: 'soccer/fra.1' },
  { id: 'fra.2', name: 'Ligue 2 (França)', slug: 'soccer/fra.2' },
  { id: 'bel.1', name: 'Belgian Pro League (Bélgica)', slug: 'soccer/bel.1' },
  { id: 'ned.1', name: 'Eredivisie (Holanda)', slug: 'soccer/ned.1' },
  { id: 'ned.2', name: 'Eerste Divisie (Holanda)', slug: 'soccer/ned.2' },
  { id: 'den.1', name: 'Superliga (Dinamarca)', slug: 'soccer/den.1' },
  { id: 'sco.1', name: 'Scottish Premiership (Escócia)', slug: 'soccer/sco.1' },
  { id: 'uefa.champions', name: 'Champions League', slug: 'soccer/uefa.champions' },
  { id: 'uefa.europa', name: 'Europa League', slug: 'soccer/uefa.europa' },
  { id: 'uefa.conf', name: 'Conference League', slug: 'soccer/uefa.europa.conf' },
  { id: 'gre.1', name: 'Greek Super League (Grécia)', slug: 'soccer/gre.1' },
  { id: 'idn.1', name: 'Indonesian Super League (Indonésia)', slug: 'soccer/idn.1' },
  { id: 'cyp.1', name: 'Cypriot First Division (Chipre)', slug: 'soccer/cyp.1' },
  { id: 'tur.1', name: 'Turkish Super Lig (Turquia)', slug: 'soccer/tur.1' },
];

export class EspnService {
  async fetchGames(date: string, leagueSlug: string = 'soccer/all'): Promise<Game[]> {
    const formattedDate = date.replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/${leagueSlug}/scoreboard?dates=${formattedDate}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao contactar API da ESPN');
      
      const data = await response.json();
      const games: Game[] = [];

      if (data.events) {
        data.events.forEach((event: any) => {
          const competition = event.competitions[0];
          const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
          const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
          
          const eventDate = new Date(event.date);
          const time = eventDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

          games.push({
            id: event.id || `espn-${Math.random().toString(36).substr(2, 9)}`,
            homeTeam: homeTeam?.team?.displayName || 'Desconhecido',
            awayTeam: awayTeam?.team?.displayName || 'Desconhecido',
            time: time,
            league: data.leagues?.[0]?.name || event.season?.slug || 'Outras Ligas'
          });
        });
      }

      return games;
    } catch (error) {
      console.error('Erro ao buscar jogos ESPN:', error);
      throw error;
    }
  }
}
