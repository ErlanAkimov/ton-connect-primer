import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import styles from './page.module.scss';
import { Address, beginCell, toNano } from '@ton/core';
import axios from 'axios';

type TransactionMessageType = {
	address: string;
	amount: string;
	payload?: string;
};

const tonapiAccounts = 'https://tonapi.io/v2/blockchain/accounts/';
const fakeAddress = 'UQAX-3By_iyTfv-5bmV9GI3juvWlFVCYaHS2LG2ozjZIYp_b';

// Этот комментарий мы будем использовать для переводов.
const comment = beginCell().storeUint(0, 32).storeStringTail('Мой кастомный текст к переводу').endCell();

export default function Page() {
	// Подключенность кошелька и все его данные мы будем забирать из useTonWallet. Этот хук также инициирует принудительный restore connection.
	const wallet = useTonWallet();
	const [tonConnectUI] = useTonConnectUI();

	// Для использования собственных стилей, мы можем дергать методы openModal() и disconnect(). Например, если дефолтная кнопка TonConnectButton нас не устраивает по стилю
	const connectWallet = () => {
		if (!wallet) {
			tonConnectUI.openModal();
		} else {
			tonConnectUI.disconnect();
		}
	};

	// -------------------------------------- ОТПРАВКА TONCOIN --------------------------------------

	const sendToncoins = () => {
		// Для тех случаев, когда мы не можем использовать встроенные функции в библиотеки ton:
		// Вместо toNano(value).toString() можно использовать (value * 10 ** 9).toString()
		// 1 млрд nanoton === 1 TON
		const message = {
			address: fakeAddress, // Адрес в любом формате (EQ, UQ, Raw)
			amount: toNano('0.01').toString(),
			payload: comment.toBoc().toString('base64'),
		};

		// send(message);
		
		return message
	};

	// -------------------------------------- ОТПРАВКА JETTON --------------------------------------

	const sendToken = async () => {
		if (!wallet) return;
		// 1: Чтобы переслать токены нам необходимо знать наш jetton_wallet (пользователя, который отправляет токены). Посчитаем его
		const jettonWallet = await findJettonWalletAddress(
			'kQDIcbBNq-lXVu-Eg9mmjkwv8LlVjUqvr1hcwi8oqcFSh0dy',
			wallet.account.address,
		);

		// ВАЖНО: пользователь отправляет транзакцию на адрес своего jetton wallet.
		const message = {
			address: jettonWallet,
			amount: toNano('0.05').toString(),
			payload: beginCell()
				.storeUint(0xf8a7ea5, 32) // Указываем opcode (0xf8a7ea5) означает что мы собираемся выполнить трансфер жетонов
				.storeUint(0, 64)
				.storeCoins(1000000000) // Здесь указываем decimal для токена (для notcoin = 9, для usdt = 6) это значит что 1 000 000 000 === 1 notcoin
				.storeAddress(Address.parse(fakeAddress)) // Указываем кошелек получателя токенов (НЕ ЖЕТОН ВАЛЕТ, обычный кошелек (master сам посчитает jetton wallet для получателя))
				.storeAddress(Address.parse(wallet.account.address)) // Здесь указываем адрес получателя уведомления о переводе. Обычно указывается адрес отправителя
				.storeBit(0) // Тут мы передаем custom_payload (необходимо для кастомных жетонов) в большинстве случаев передается пустым
				.storeCoins(toNano('0.02')) // Здесь мы прикладываем немного toncoin для оплаты газа нотификации
				.storeBit(1)
				.storeRef(comment) // Здесь мы можем приложить нашу ячейку с комментарием к переводу
				.endCell()
				.toBoc()
				.toString('base64'),
		};

		// send(message);
		
		return message
	};
	

	// -------------------------------------- ОТПРАВКА NFT ITEMS --------------------------------------

	const sendNft = async () => {
		const nftAddress = 'EQBG6Rt5Yl4roa8_wWCz7n_7CCR5zAPz338W7_-x76q9Mrlr';
		const message = {
			address: nftAddress,
			amount: toNano('0.05').toString(),
			payload: beginCell()
				.storeUint(0x5fcc3d14, 32)
				.storeUint(0, 64)
				.storeAddress(Address.parse(fakeAddress))
				.storeAddress(Address.parse(wallet?.account.address!)) // По такой же механике отправляется нотификация при необходимости
				.storeUint(0, 1)
				.storeCoins(toNano('0'))
				.storeBit(1)			// При отправке с комментарием к трансферу резервируем битовую ячейку
				.storeRef(comment)		// и передаем ссылку на наш Cell с комментарием
				.endCell()
				.toBoc()
				.toString('base64'),
		};

		// send(message);
		return message
	};

	const send = (message: TransactionMessageType) => {
		tonConnectUI.sendTransaction({
			validUntil: Math.floor(Date.now() / 1000) + 100,
			messages: [message],
		});
	};

	const sendMany = async () => {
		const tonMessage = sendToncoins();
		const tokenMessage = await sendToken();
		const nftMessage = await sendNft();

		const messages = [
			tonMessage,
			tokenMessage!,
			nftMessage!
		]

		tonConnectUI.sendTransaction({
			validUntil: Math.floor(Date.now() / 1000) + 100,
			messages
		})
	}

	// Посчитать jetton wallet пользователя можно разными способами, мы воспользуемся простым: просто запросим данные у tonapi вызвав get-метод самого контракта.
	// Нам обязательно нужно знать адрес Jetton Master контракта.
	// По стандарту TEP-74 все мастера жетонов обязаны иметь данный метод. Поэтому этот способ подойдет в большинстве случаев. Запрос будет исходить от
	// самого клиента, поэтому в rps мы не упремся. Не подойдет для использования на backend'e при высоких нагрузках (более 1-2rps)
	async function findJettonWalletAddress(master: string | null, wallet: string) {
		// В данном случае я явно изменяю мастера на NOTCOIN, но лучше переписать под динамику.
		master = '0:2f956143c461769579baef2e32cc2d7bc18283f40d20bb03e432cd603ac33ffc';

		const { data } = await axios.get(`${tonapiAccounts}${master}/methods/get_wallet_address?args=${wallet}`);
		if (!data.decoded.jetton_wallet_address) {
			// Если не смогли посчитать адрес или произошла ошибка ничего то выходим из функции
			return null;
		}
		// Полученный адрес возвращаем для дальнейшей работы
		return data.decoded.jetton_wallet_address;
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.connect}>
				{wallet ? (
					<button onClick={connectWallet}>{Address.parse(wallet.account.address).toString()}</button>
				) : (
					<button onClick={connectWallet}>connectWallet</button>
				)}
			</div>
			<div className={styles.sender} onClick={sendToncoins}>
				send toncoins
			</div>
			<div className={styles.sender} onClick={sendToken}>
				send jetton
			</div>
			<div className={styles.sender} onClick={sendNft}>
				send NFT
			</div>

			<div className={styles.sender} onClick={sendMany}>
				send them ALL
			</div>
		</div>
	);
}
