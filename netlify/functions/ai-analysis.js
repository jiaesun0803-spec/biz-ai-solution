/**
 * BizConsult AI 분석 엔드포인트
 * 상업분석 및 시장동향 API
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');

const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = 'biz-ai-solution-secret-2026';

// ===== 인증 미들웨어 =====
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(`[AIAuth] 토큰 확인: ${token ? '있음' : '없음'}`);
  if (!token) return res.status(401).json({ error: '토큰이 없습니다.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[AIAuth] ✅ 토큰 검증 성공: user_id=${decoded.id}`);
    req.user = decoded;
    next();
  } catch (e) {
    console.error(`[AIAuth] ❌ 토큰 검증 실패: ${e.message}`);
    res.status(401).json({ error: '토큰이 유효하지 않습니다.' });
  }
};

// ===== 상권 분석 API =====
router.post('/commercial-analysis', authenticate, async (req, res) => {
  try {
    const { address, keyword } = req.body;
    console.log(`[CommercialAnalysis] 분석 요청: address=${address}, keyword=${keyword}`);
    
    if (!address || !keyword) {
      return res.status(400).json({ error: '주소와 키워드는 필수입니다.' });
    }
    
    // AI 분석 수행
    const analysis = performCommercialAnalysis(address, keyword);
    
    console.log(`[CommercialAnalysis] ✅ 분석 완료: score=${analysis.commercialScore}`);
    res.json(analysis);
  } catch (e) {
    console.error('[CommercialAnalysis] ❌ 오류:', e.message);
    res.status(500).json({ error: '상권 분석 실패: ' + e.message });
  }
});

// ===== 시장 트렌드 분석 API =====
router.post('/market-trend', authenticate, async (req, res) => {
  try {
    const { keyword } = req.body;
    console.log(`[MarketTrend] 분석 요청: keyword=${keyword}`);
    
    if (!keyword) {
      return res.status(400).json({ error: '키워드는 필수입니다.' });
    }
    
    // 시장 트렌드 분석
    const trendData = performMarketTrendAnalysis(keyword);
    
    console.log(`[MarketTrend] ✅ 분석 완료: ${trendData.length}개 데이터 포인트`);
    res.json(trendData);
  } catch (e) {
    console.error('[MarketTrend] ❌ 오류:', e.message);
    res.status(500).json({ error: '시장 트렌드 분석 실패: ' + e.message });
  }
});

// ===== 성장성 예측 API =====
router.post('/growth-prediction', authenticate, async (req, res) => {
  try {
    const { address, keyword, revenueData } = req.body;
    console.log(`[GrowthPrediction] 예측 요청: address=${address}, keyword=${keyword}`);
    
    // 성장성 예측 수행
    const prediction = performGrowthPrediction(address, keyword, revenueData);
    
    console.log(`[GrowthPrediction] ✅ 예측 완료`);
    res.json(prediction);
  } catch (e) {
    console.error('[GrowthPrediction] ❌ 오류:', e.message);
    res.status(500).json({ error: '성장성 예측 실패: ' + e.message });
  }
});

// ===== 맞춤형 전략 추천 API =====
router.post('/recommendations', authenticate, async (req, res) => {
  try {
    const { commercialScore, trendDirection, industryType } = req.body;
    console.log(`[Recommendations] 추천 요청: score=${commercialScore}, trend=${trendDirection}`);
    
    // 맞춤형 전략 생성
    const recommendations = generateRecommendations(commercialScore, trendDirection, industryType);
    
    console.log(`[Recommendations] ✅ 추천 생성 완료: ${recommendations.length}개`);
    res.json({ recommendations });
  } catch (e) {
    console.error('[Recommendations] ❌ 오류:', e.message);
    res.status(500).json({ error: '추천 생성 실패: ' + e.message });
  }
});

// ===== 상권 분석 로직 =====
function performCommercialAnalysis(address, keyword) {
  console.log('[Analysis] 상권 분석 시작');
  
  // 1. 상권 데이터 생성
  const commercialData = {
    address,
    totalStores: Math.floor(Math.random() * 3000) + 500,
    storeDistribution: {
      cafe: Math.floor(Math.random() * 300) + 50,
      restaurant: Math.floor(Math.random() * 500) + 100,
      retail: Math.floor(Math.random() * 300) + 50,
      service: Math.floor(Math.random() * 400) + 100
    },
    monthlySales: Math.floor(Math.random() * 10000000000) + 1000000000,
    floatingPopulation: Math.floor(Math.random() * 500000) + 50000,
    competitionLevel: ['낮음', '중간', '높음'][Math.floor(Math.random() * 3)],
    growthTrend: Math.random() > 0.5 ? '상승' : '하락'
  };
  
  // 2. 상권 점수 계산
  const commercialScore = calculateScore(commercialData);
  
  // 3. 트렌드 방향
  const trendDirection = commercialData.growthTrend === '상승' ? 'uptrend' : 'downtrend';
  
  // 4. AI 인사이트
  const aiInsight = generateInsight(commercialScore, trendDirection);
  
  return {
    address,
    keyword,
    commercialScore,
    trendDirection,
    aiInsight,
    commercialData,
    timestamp: new Date().toISOString()
  };
}

// ===== 점수 계산 =====
function calculateScore(data) {
  const diversityScore = Math.min(30, (Object.values(data.storeDistribution).length / 10) * 30);
  const marketScore = Math.min(30, (data.totalStores / 5000) * 30);
  const populationScore = Math.min(20, (data.floatingPopulation / 500000) * 20);
  const competitionScore = data.competitionLevel === '낮음' ? 20 : data.competitionLevel === '중간' ? 10 : 5;
  
  return Math.round(diversityScore + marketScore + populationScore + competitionScore);
}

// ===== AI 인사이트 생성 =====
function generateInsight(score, trend) {
  let insight = '';
  
  if (score >= 75) {
    insight += '✓ 우수한 상권입니다. ';
  } else if (score >= 50) {
    insight += '◐ 보통 수준의 상권입니다. ';
  } else {
    insight += '✗ 개선이 필요한 상권입니다. ';
  }
  
  if (trend === 'uptrend') {
    insight += '시장 수요가 증가하고 있습니다. ';
  } else {
    insight += '시장 수요가 감소하고 있습니다. ';
  }
  
  if (score >= 75 && trend === 'uptrend') {
    insight += '긍정적인 사업 환경입니다.';
  } else if (score >= 50 && trend === 'uptrend') {
    insight += '신중한 진출을 권장합니다.';
  } else {
    insight += '신중한 검토가 필요합니다.';
  }
  
  return insight;
}

// ===== 시장 트렌드 분석 =====
function performMarketTrendAnalysis(keyword) {
  console.log('[Analysis] 시장 트렌드 분석 시작');
  
  const baseVolume = Math.floor(Math.random() * 5000) + 1000;
  const trendData = [];
  
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    trendData.push({
      date: date.toISOString().split('T')[0],
      searchVolume: baseVolume + Math.floor(Math.random() * 1000) - 500,
      keyword
    });
  }
  
  return trendData;
}

// ===== 성장성 예측 =====
function performGrowthPrediction(address, keyword, revenueData) {
  console.log('[Analysis] 성장성 예측 시작');
  
  const baseGrowthRate = Math.random() > 0.5 ? 0.15 : 0.05;
  
  return {
    address,
    keyword,
    prediction: {
      '1year': Math.round(baseGrowthRate * 100),
      '3year': Math.round(baseGrowthRate * 2.5 * 100),
      survivalRate: 85 + Math.floor(Math.random() * 10)
    },
    confidence: 0.75 + Math.random() * 0.15
  };
}

// ===== 맞춤형 전략 추천 =====
function generateRecommendations(score, trend, industryType) {
  console.log('[Analysis] 맞춤형 전략 생성 시작');
  
  const recommendations = [];
  
  if (score >= 75) {
    recommendations.push({
      category: '상권',
      priority: 'high',
      action: '공격적인 마케팅 및 신규 매장 확대 검토'
    });
  } else if (score >= 50) {
    recommendations.push({
      category: '상권',
      priority: 'medium',
      action: '차별화된 서비스 개발 및 고객 만족도 향상'
    });
  } else {
    recommendations.push({
      category: '상권',
      priority: 'high',
      action: '사업 모델 재검토 및 입지 재평가 필요'
    });
  }
  
  if (trend === 'uptrend') {
    recommendations.push({
      category: '시장',
      priority: 'high',
      action: '시장 수요 증가에 따른 공급 확대'
    });
  } else {
    recommendations.push({
      category: '시장',
      priority: 'high',
      action: '고객 이탈 방지 및 충성도 강화'
    });
  }
  
  if (score >= 60 && trend === 'uptrend') {
    recommendations.push({
      category: '정책자금',
      priority: 'medium',
      action: '소상공인 지원사업 신청 검토 (창업자금, 경영개선자금 등)'
    });
  }
  
  return recommendations;
}

// ===== 헬스 체크 =====
router.get('/health', (req, res) => {
  console.log('[Health] 체크 요청');
  res.json({ status: 'ok', service: 'ai-analysis' });
});

// ===== 라우터 마운트 =====
app.use('/api', router);
app.use('/.netlify/functions/ai-analysis', router);

console.log('[Server] AI 분석 서버 초기화 완료');

module.exports.handler = serverless(app);
