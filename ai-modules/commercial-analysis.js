/**
 * BizConsult AI 엔진 - 상업분석 및 시장동향 모듈
 * 소상공인 365 벤치마킹 기반 고도화 기능
 */

// ===== 상권 분석 API =====
async function analyzeCommercialArea(address, keyword) {
  try {
    console.log(`[CommercialAnalysis] 분석 시작: ${address}, ${keyword}`);
    
    // 1. 상가(상권)정보 API 호출 (공공데이터포털)
    const commercialData = await fetchCommercialData(address);
    
    // 2. 시장 트렌드 데이터 (네이버 데이터랩 API)
    const trendData = await fetchMarketTrendData(keyword);
    
    // 3. AI 분석 (통합 진단)
    const analysis = performIntegratedAnalysis(commercialData, trendData);
    
    console.log('[CommercialAnalysis] ✅ 분석 완료');
    return analysis;
  } catch (e) {
    console.error('[CommercialAnalysis] ❌ 오류:', e.message);
    throw e;
  }
}

// ===== 상권 데이터 수집 =====
async function fetchCommercialData(address) {
  try {
    console.log(`[CommercialData] 상권 정보 조회: ${address}`);
    
    // 실제 환경에서는 공공데이터포털 API 호출
    // 현재는 시뮬레이션 데이터 반환
    const mockData = {
      address: address,
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
    
    console.log('[CommercialData] ✅ 조회 완료');
    return mockData;
  } catch (e) {
    console.error('[CommercialData] ❌ 오류:', e.message);
    throw e;
  }
}

// ===== 시장 트렌드 데이터 수집 =====
async function fetchMarketTrendData(keyword) {
  try {
    console.log(`[MarketTrend] 시장 트렌드 조회: ${keyword}`);
    
    // 실제 환경에서는 네이버 데이터랩 API 호출
    // 현재는 시뮬레이션 데이터 반환
    const baseVolume = Math.floor(Math.random() * 5000) + 1000;
    const trendData = [];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      trendData.push({
        date: date.toISOString().split('T')[0],
        searchVolume: baseVolume + Math.floor(Math.random() * 1000) - 500,
        keyword: keyword
      });
    }
    
    console.log('[MarketTrend] ✅ 조회 완료');
    return trendData;
  } catch (e) {
    console.error('[MarketTrend] ❌ 오류:', e.message);
    throw e;
  }
}

// ===== 통합 AI 분석 =====
function performIntegratedAnalysis(commercialData, trendData) {
  try {
    console.log('[IntegratedAnalysis] 통합 분석 시작');
    
    // 1. 상권 점수 계산
    const commercialScore = calculateCommercialScore(commercialData);
    
    // 2. 트렌드 방향 판단
    const trendDirection = analyzeTrendDirection(trendData);
    
    // 3. 종합 평가 및 추천
    const aiInsight = generateAIInsight(commercialScore, trendDirection, commercialData);
    
    // 4. 성장성 예측
    const growthPrediction = predictGrowth(commercialData, trendData);
    
    // 5. 맞춤형 전략 추천
    const recommendations = generateRecommendations(commercialScore, trendDirection, commercialData);
    
    console.log('[IntegratedAnalysis] ✅ 분석 완료');
    
    return {
      address: commercialData.address,
      commercialScore,
      trendDirection,
      aiInsight,
      growthPrediction,
      recommendations,
      commercialData,
      trendData,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error('[IntegratedAnalysis] ❌ 오류:', e.message);
    throw e;
  }
}

// ===== 상권 점수 계산 =====
function calculateCommercialScore(data) {
  // 점포 다양성 (0-30점)
  const diversityScore = Math.min(30, (Object.values(data.storeDistribution).length / 10) * 30);
  
  // 시장 규모 (0-30점)
  const marketScore = Math.min(30, (data.totalStores / 5000) * 30);
  
  // 유동인구 (0-20점)
  const populationScore = Math.min(20, (data.floatingPopulation / 500000) * 20);
  
  // 경쟁 수준 (0-20점)
  const competitionScore = data.competitionLevel === '낮음' ? 20 : data.competitionLevel === '중간' ? 10 : 5;
  
  return Math.round(diversityScore + marketScore + populationScore + competitionScore);
}

// ===== 트렌드 방향 분석 =====
function analyzeTrendDirection(trendData) {
  if (trendData.length < 2) return 'neutral';
  
  const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
  const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.searchVolume, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.searchVolume, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 10) return 'uptrend';
  if (changePercent < -10) return 'downtrend';
  return 'stable';
}

// ===== AI 인사이트 생성 =====
function generateAIInsight(score, trend, data) {
  let insight = '';
  
  // 상권 평가
  if (score >= 75) {
    insight += '✓ 우수한 상권입니다. ';
  } else if (score >= 50) {
    insight += '◐ 보통 수준의 상권입니다. ';
  } else {
    insight += '✗ 개선이 필요한 상권입니다. ';
  }
  
  // 트렌드 평가
  if (trend === 'uptrend') {
    insight += '시장 수요가 증가하고 있습니다. ';
  } else if (trend === 'downtrend') {
    insight += '시장 수요가 감소하고 있습니다. ';
  } else {
    insight += '시장이 안정적입니다. ';
  }
  
  // 최종 평가
  if (score >= 75 && trend === 'uptrend') {
    insight += '긍정적인 사업 환경입니다.';
  } else if (score >= 50 && trend !== 'downtrend') {
    insight += '신중한 진출을 권장합니다.';
  } else {
    insight += '신중한 검토가 필요합니다.';
  }
  
  return insight;
}

// ===== 성장성 예측 =====
function predictGrowth(commercialData, trendData) {
  const trendDirection = analyzeTrendDirection(trendData);
  const competitionFactor = commercialData.competitionLevel === '낮음' ? 1.2 : commercialData.competitionLevel === '중간' ? 1.0 : 0.8;
  
  const baseGrowthRate = trendDirection === 'uptrend' ? 0.15 : trendDirection === 'downtrend' ? -0.10 : 0.05;
  const adjustedGrowthRate = baseGrowthRate * competitionFactor;
  
  return {
    '1year': Math.round(adjustedGrowthRate * 100),
    '3year': Math.round(adjustedGrowthRate * 2.5 * 100),
    survivalRate: Math.round(90 - (adjustedGrowthRate < 0 ? 20 : 0))
  };
}

// ===== 맞춤형 전략 추천 =====
function generateRecommendations(score, trend, data) {
  const recommendations = [];
  
  // 상권 기반 추천
  if (data.competitionLevel === '낮음') {
    recommendations.push('경쟁이 적은 상권입니다. 신규 진출 기회가 좋습니다.');
  } else if (data.competitionLevel === '높음') {
    recommendations.push('경쟁이 심한 상권입니다. 차별화된 전략이 필요합니다.');
  }
  
  // 트렌드 기반 추천
  if (trend === 'uptrend') {
    recommendations.push('상승 추세의 시장입니다. 공격적인 마케팅을 권장합니다.');
  } else if (trend === 'downtrend') {
    recommendations.push('하락 추세의 시장입니다. 고객 유지에 집중하세요.');
  }
  
  // 정책자금 추천
  if (score >= 60 && trend !== 'downtrend') {
    recommendations.push('정책자금 신청 대상입니다. 소상공인 지원사업을 검토하세요.');
  }
  
  return recommendations;
}

// ===== 내보내기 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeCommercialArea,
    fetchCommercialData,
    fetchMarketTrendData,
    performIntegratedAnalysis,
    calculateCommercialScore,
    analyzeTrendDirection,
    generateAIInsight,
    predictGrowth,
    generateRecommendations
  };
}
