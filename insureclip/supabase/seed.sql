-- InsureClip Seed Data: Topic Library

insert into public.topics (category, title_en, title_zh, description_en, description_zh, season, tags) values

-- Product Education
('product_education', '3 reasons VHIS is worth it', '醫療保障3大理由你要知', 'Explain key benefits of Voluntary Health Insurance Scheme', '解釋自願醫保計劃的主要好處', null, '{"VHIS","health insurance","medical"}'),
('product_education', 'What is critical illness insurance?', '危疾保險係咩？', 'Introduction to critical illness coverage', '危疾保險介紹', null, '{"critical illness","insurance basics"}'),
('product_education', 'How MPF voluntary contributions work', 'MPF自願性供款點運作', 'Explain MPF voluntary contributions and tax benefits', '解釋強積金自願供款及稅務優惠', null, '{"MPF","retirement","tax"}'),
('product_education', 'Savings plans vs bank deposits: which is better?', '儲蓄保險 vs 銀行存款：邊個好？', 'Compare savings plans with traditional banking', '比較儲蓄保險與傳統銀行產品', null, '{"savings","comparison","investment"}'),
('product_education', 'Life insurance: term vs whole life explained', '定期 vs 終身壽險大比較', 'Clear explanation of term vs whole life insurance', '清晰解釋定期保險與終身壽險', null, '{"life insurance","term","whole life"}'),
('product_education', 'How VHIS reduces your hospital bills', 'VHIS點樣幫你減少醫療費用', 'Practical examples of VHIS savings', 'VHIS節省醫療費用的實際例子', null, '{"VHIS","medical","savings"}'),
('product_education', 'Understanding annuity plans for retirement', '退休年金計劃全攻略', 'Guide to annuity plans for retirement planning', '退休年金計劃完整指南', null, '{"annuity","retirement","planning"}'),
('product_education', 'What does general insurance cover?', '一般保險保障範圍', 'Overview of general insurance products', '一般保險產品概覽', null, '{"general insurance","home","car"}'),

-- Life Events
('life_events', 'Just got married? Here are 3 insurance must-dos', '新婚必做3件事', 'Insurance checklist for newlyweds', '新婚夫婦保險清單', null, '{"marriage","life events","checklist"}'),
('life_events', 'Having a baby: protect your growing family', '迎接新生命：為家人做好保障', 'Insurance planning for new parents', '新手父母保險規劃', null, '{"baby","family","protection"}'),
('life_events', 'Buying your first property in HK? Read this first', '首次置業前必讀', 'Insurance considerations for homebuyers', '置業保險考量', null, '{"property","mortgage","home"}'),
('life_events', 'Retirement planning: start at 40, not 60', '40歲開始退休規劃唔係太早', 'Why starting retirement planning at 40 is smart', '40歲開始退休規劃的智慧', null, '{"retirement","planning","wealth"}'),
('life_events', 'Planning for your children''s education costs', '子女教育基金規劃', 'Education fund planning guide', '教育基金規劃指南', null, '{"education","children","savings"}'),
('life_events', 'Protecting your income if you can''t work', '如果你唔能夠工作，你嘅收入有保障嗎？', 'Income protection insurance explained', '入息保障保險解釋', null, '{"income protection","disability","protection"}'),

-- Market Commentary
('market_commentary', 'How interest rate changes affect your insurance', '利率變動點影響你嘅保險', 'Explain the relationship between interest rates and insurance', '利率與保險的關係', null, '{"interest rates","market","savings"}'),
('market_commentary', 'Stock market volatility: why protection matters more now', '股市波動：點解保障更加重要', 'Market perspective on insurance in volatile times', '波動市場中保障的重要性', null, '{"stock market","volatility","protection"}'),
('market_commentary', 'New HKIA guidelines: what agents need to know', '保監新指引：保險顧問須知', 'Summary of latest HK Insurance Authority updates', '最新香港保監局更新摘要', null, '{"regulation","HKIA","compliance"}'),
('market_commentary', 'Tax season tips: insurance deductions you can claim', '稅務季節貼士：可扣稅保險產品', 'Tax deductions available through insurance products', '保險產品可享稅務扣減', 'tax_season', '{"tax","deduction","QDAP","VHIS"}'),

-- Seasonal
('seasonal', 'Chinese New Year: start the year with good financial health', '農曆新年：以良好財務狀況迎接新一年', 'Financial planning tips for Chinese New Year', '農曆新年財務規劃貼士', 'chinese_new_year', '{"CNY","planning","wealth"}'),
('seasonal', 'Mid-Autumn: a time to think about family protection', '中秋節：思考家庭保障的好時機', 'Family protection planning during Mid-Autumn', '中秋節家庭保障規劃', 'mid_autumn', '{"Mid-Autumn","family","protection"}'),
('seasonal', 'Year-end financial review: are you covered?', '年終財務回顧：你的保障夠嗎？', 'Annual insurance and financial review checklist', '年度保險及財務回顧清單', 'year_end', '{"year-end","review","planning"}'),
('seasonal', 'Policy renewal season: should you upgrade?', '保單續期季節：係時候升級嗎？', 'Guide to policy renewal decisions', '保單續期決策指南', 'renewal', '{"renewal","upgrade","review"}'),
('seasonal', 'Back to school: education planning for parents', '開學季：家長教育規劃', 'Education fund planning as school year starts', '開學前教育基金規劃', 'back_to_school', '{"education","children","back to school"}'),

-- Client Engagement
('client_engagement', 'Happy birthday! Here''s a gift for you', '生日快樂！送您一份禮物', 'Birthday greeting template for clients', '客戶生日問候模板', null, '{"birthday","relationship","engagement"}'),
('client_engagement', 'Your policy anniversary: let''s review your coverage', '保單週年：一起回顧您的保障', 'Policy anniversary review message', '保單週年回顧訊息', null, '{"anniversary","review","service"}'),
('client_engagement', 'How to make a claim: step by step', '索償步驟：一步一步話你知', 'Claim process walkthrough for clients', '客戶索償流程說明', null, '{"claim","process","education"}'),
('client_engagement', 'Thank you for trusting me with your protection', '感謝您對我的信任', 'Thank you message for clients', '感謝客戶的訊息', null, '{"thank you","relationship","appreciation"}'),
('client_engagement', 'I''m here to help: book a free financial review', '我在這裡：預約免費財務回顧', 'CTA for booking a financial review', '預約財務回顧的行動呼籲', null, '{"review","booking","service"}');
