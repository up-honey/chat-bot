import './App.css';
import './css/ChatBot.css';
import { FaTimes } from 'react-icons/fa'; // 아이콘 임포트
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
	const [isOpen, setOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState(''); // 직접 인풋에 타이핑한 검색값
	const messagesEndRef = useRef(null); // 메세지 끝 참조
	const [guestToken, setGuestToken] = useState('');
	const [suggestions, setSuggestions] = useState([]); // 추천 질문 상태 추가
	const [focustIndex, setFocusIndex] = useState(-1);
	const inputRef = useRef(null); // 클릭 후 인풋 포커스 용
	const [debounceTimeout, setDebounceTimeout] = useState(null);

	// 자동완성 더미 데이터
	// const dummy = [
	// 	'굽네치킨',
	// 	'교촌치킨',
	// 	'BBQ치킨',
	// 	'BHC치킨',
	// 	'네네치킨',
	// 	'파파존스',
	// 	'도미노피자',
	// 	'피자헛',
	// 	'미스터피자'
	// ];

	// 자동완성 api 연결
	const autoKeywordApi = async (query) => {
		const trimmedQuery = query.trim();

		if (trimmedQuery) {
			try {
				const response = await axios.get(`http://192.168.0.208:10124/api/v1/search`, {
					params: { 
						search_query: trimmedQuery
					},
					headers: { 
						'Authorization': `Bearer ${guestToken}`,
						'Content-Type': 'application/json',
						'Accept': 'application/json'
					}
				});
				console.log('자동완성', response);
				// 응답 데이터 처리
				if (response.data && response.data.data && Array.isArray(response.data.data)) {
					const suggestions = response.data.data
						.filter(item => item.question_text) // null이나 undefined 필터링
						.map(item => item.question_text);
					setSuggestions(suggestions);

					console.log('검색 결과 개수', response.data.count);
					console.log('검색 결과', suggestions);

				} else {
					console.error('예상치 못한 응답 형식:', response.data);
					setSuggestions([]);
				}
			} catch (error) {
				// 상세한 에러 로깅
				if (error.response) {
					// 서버 응답이 있는 경우
					console.error('서버 응답 에러:', {
						status: error.response.status,
						data: error.response.data,
						headers: error.response.headers
					});
				} else if (error.request) {
					// 요청은 보냈지만 응답을 받지 못한 경우
					console.error('응답 수신 실패:', error.request);
				} else {
					// 요청 설정 중 오류 발생
					console.error('요청 설정 오류:', error.message);
				}
				setSuggestions([]);
			}
		} else {
			setSuggestions([]);
		}
	};
	

	//자동 검색
	// const autoSearch = (query) => {
	// 	if(query.trim()){
	// 		// const normalizedQuery = query.replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase();
	// 		const filter = dummy.filter(item => item.includes(query));
	// 		setSuggestions(filter);
	// 	}else{
	// 		setSuggestions([]);
	// 	}
	// };
	
	// 입력값 변경 시 API 호출
	const handleInputChange = (e) => {
		const value = e.target.value;
		setInput(value);
		setFocusIndex(-1);
		
		// API 호출에 디바운스 적용
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
		
		// 입력값이 있을 때만 API 호출
		if (value.trim()) {
			const newTimeout = setTimeout(() => {
				autoKeywordApi(value);
			}, 300);
			setDebounceTimeout(newTimeout);
		} else {
			setSuggestions([]); // 입력값이 없으면 추천 목록 비우기
		}
	};

	// 키보드 이벤트
	const keyEvent = (e) => {
		if(suggestions.length === 0) return;

		switch (e.key){
			case 'ArrowDown':
				e.preventDefault();
				setFocusIndex(prevIndex => {
					const newIndex = (prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0);
					setInput(suggestions[newIndex]);
					return newIndex;
				});
				break;
			case 'ArrowUp':
				e.preventDefault();
				setFocusIndex(prevIndex => {
					const newIndex = (prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1);
					setInput(suggestions[newIndex]);
					return newIndex;
				});
				break;
			case 'Enter':
				if(focustIndex >= 0 && focustIndex < suggestions.length) {
					e.preventDefault();
					handleSuggestionSelect(suggestions[focustIndex]);
				}
				break;
			case 'Escape':
				setSuggestions([]);
				setFocusIndex(-1);
				break;
			default:
				break;
		}
	}

	// 포커스 이동
	const handleSuggestionSelect = (suggestion) => {
		setInput(suggestion);
		setSuggestions([]);
		setFocusIndex(-1);

		inputRef.current.focus(); // 입력 필드에 포커스 설정
	};

	// 입력값으로 자동완성
	// const autoSearchChange = (e) => {
	// 	setInput(e.target.value);
	// 	setFocusIndex(-1);
	// 	//autoSearch(e.target.value.trim()); //더미 데이터 테스트
	// 	//autoKeywordApi(e.target.value.trim()); // api 연결
	// }

	//챗봇 열고 닫기
	const chatToggle = () => {
		setOpen(openToggle => !openToggle);
	};

	// 세션 키
	const SessionKey = 'chat-session';

	// 게스트 토큰 받기
	const loadSession = async () => {
		try{
		const response = await axios.get('http://192.168.0.208:10124/api/v1/guest', {
			headers: {
			'Accept' : 'application/json'
			}
		});
		const data = response.data;
		localStorage.setItem(SessionKey, JSON.stringify(data));

		// console.log('토큰 데이터', response.data);

		if(data.access_token){
			setGuestToken(data.access_token);
			// localStorage.setItem('guestToken', data.access_token); //로컬 스토리지에 저장
		} else {
			console.error('토큰이 유효하지 않습니다.');
		}
		} catch (error) {
			console.error('토큰 발급 오류', error);
		}
	};

	// 게스트 토큰 요청
	useEffect(() => {
		if(!guestToken){
			loadSession();
		}
	}, [guestToken]);

	// 챗봇 채팅
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!input.trim()) return; // 빈 값 입력 반환

		const userMessage = { role : 'user', content: input };
		setMessages(prveMessages => [...prveMessages, userMessage]); //사용자 메세지 추가
		setInput(''); //필드 초기화
		setSuggestions([]);
		// console.log('전송할 토큰', guestToken);

		try {
			// 첫 번째 API 호출: 채널 생성
			const channelResponse = await axios.post(
				'http://192.168.0.208:10124/api/v1/chat',
				{ title: input },
				{ headers: { Authorization: `Bearer ${guestToken}` } }
			);
	
			const channelId = channelResponse.data.id; // 채널 ID 추출
	
			// 두 번째 API 호출: 채팅 메시지 전송
			const chatResponse = await axios.post(
				`http://192.168.0.208:10124/api/v1/chat/${channelId}`,
				{
					history_type: 'q',
					content_type: 'text',
					contents: input,
					rating: 0
				},
				{ 
					headers: { 
						'Authorization': `Bearer ${guestToken}`,
						'Content-Type': 'application/json'
					} 
				}
			);
			// console.log('챗봇 응답', chatResponse);
			// 응답 처리
			const assistantMessage = {
				role: 'assistant',
				content: chatResponse.data.data[1].contents || '응답을 받지 못했습니다.'
			};
			// console.log('응답', chatResponse.data.data[1].contents);

			setMessages(prevMessages => [...prevMessages, assistantMessage]); // 챗봇 응답 추가
			// console.log("챗봇 응답 값: ", assistantMessage);
	
		} catch (error) {
			console.error("API 호출 오류", error);
			const errorMessage = {
				role: 'assistant',
				content: `오류가 발생했습니다: ${error.message}`
			};
			setMessages(prevMessages => [...prevMessages, errorMessage]);
		}
	};

	// 채팅 스크롤 아래로 내리기
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	return (
		<div className="wrap">
			<div className='chatbot-wrap'>
				<div className={`chat-bot-container ${isOpen ? 'open':''}`}>
					<div className="chat-bot-header">
						<h3>🤖 챗봇</h3>
						<button onClick={chatToggle} className="chat-bot-close-button">
						<FaTimes />
						</button>
					</div>

					<div className="chat-bot-messages">
						<div className="chat-bot-message assistant">
							<strong>🤖 챗봇 : </strong>안녕하세요! 무엇을 도와드릴까요?
						</div>
						{messages.map((msg, index) => (
							<div key={index} className={`chat-bot-message ${msg.role}`}>
								<strong>{msg.role === 'user' ? '😊 당신:' : '🤖 챗봇:'}</strong> {msg.content}
							</div>
						))}
						{/* 스크롤을 위한 빈 div */}
						<div ref={messagesEndRef} /> 
					</div>

					<form className="chat-bot-input-form" onSubmit={handleSubmit}>
						<div className='auto_keyword'>
							{suggestions.length > 0 && (
								<ul className='auto_list'>
									{suggestions.map((suggestions, index) => (
										<li className={index === focustIndex ? 'focused' : ''} key={index} onClick={() => handleSuggestionSelect(suggestions)}>
											{suggestions}
										</li>
									))}
								</ul>
							)}
						</div>
						<input
							type="text"
							placeholder="여기에 메시지를 입력해주세요."
							value={input}
							// onChange={(e) => setInput(e.target.value)}
							onChange={handleInputChange}
							onKeyDown={keyEvent}
							ref={inputRef}
						/>
						<button type="submit">전송</button>
					</form>
				</div>

				<button className='chat-bot-button' onClick={chatToggle}>
				💬 채팅 시작
				</button>
			</div>
		</div>
	);
}

export default App;
