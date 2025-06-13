import { CardPlacedThisTurn, WordCardData } from "@/types";

const board = [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
]


export type PublicPlayerInfo = {
    playerId: string;
    username: string;
    avatarUrl: string;
    isTurn: boolean;
    cardCount: number;
}


export type PrivatePlayerInfo = {
    playerId: string;
    username: string;
    avatarUrl: string;
    isTurn: boolean;
    cards: WordCardData[];
}


export type CardsLeft = {
    number: number;
}



export const publicGameState: {
    board: typeof board;
    players: PublicPlayerInfo[];
    cardsLeft: CardsLeft;
} = {
    board: board,
    players: [],
    cardsLeft: { number: 0 }
}


export const privateGameState: {
    board: typeof board;
    players: PrivatePlayerInfo[];
    cardsLeft: CardsLeft;
} = {
    board: board,
    players: [],
    cardsLeft: { number: 0 }
}