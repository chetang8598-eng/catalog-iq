import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  { id: 'general', label: 'General Info', icon: '📋' },
  { id: 'marketing', label: 'Marketing Content', icon: '✍️' },
  { id: 'physical', label: 'Physical Specs', icon: '📏' },
  { id: 'battery', label: 'Power & Battery', icon: '🔋' },
  { id: 'source', label: 'Sources', icon: '🌐' }
];

const App = () => {
  const [productInput, setProductInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [results, setResults] = useState([]); // Store array of products for bulk
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleReset = () => {
    setProductInput('');
    setResults([]);
    setSelectedResultIndex(0);
    setError(null);
    setLoading(false);
    setActiveTab('general');
    setCopyStatus({});
    setProgress({ current: 0, total: 0 });
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      "Item Name", "Product Category", "Product Subcategory", "Recommended Browse Nodes",
      "Model Name", "Manufacturer", "Bullet Point 1", "Bullet Point 2", "Bullet Point 3",
      "Bullet Point 4", "Bullet Point 5", "Bullet Point 6", "Generic Keyword",
      "Material", "Item Type Name", "Product Description", "Color", 
      "Item Length", "Item Length Unit", "Item Width", "Item Width Unit", "Item Height", "Item Height Unit",
      "Item Package Length", "Package Length Unit", "Item Package Width", "Package Width Unit", "Item Package Height", "Package Height Unit",
      "Country of Origin", "Are batteries required?", "Are batteries included?", "Battery Cell Composition", 
      "Battery Weight", "Battery Weight Unit", "Number of Batteries", "Battery Type", "Number of Lithium-ion Cells",
      "Lithium Battery Energy Content", "Lithium Battery Energy Content Unit", "Lithium Battery Packaging", 
      "Item Weight", "Item Weight Unit", "Has Multiple Battery Powered Components", "Contains Battery or Cell", "Source Link"
    ];

    const rows = results.map(productData => {
      return [
        productData.itemName,
        productData.productCategory,
        productData.productSubcategory,
        productData.recommendedBrowseNodes,
        productData.modelName,
        productData.manufacturer,
        ...(productData.bulletPoints || []).slice(0, 6),
        ...Array(Math.max(0, 6 - (productData.bulletPoints?.length || 0))).fill("N/A"),
        productData.genericKeywords,
        productData.material,
        productData.itemTypeName,
        productData.productDescription,
        productData.color,
        productData.itemLength, productData.itemLengthUnit,
        productData.itemWidth, productData.itemWidthUnit,
        productData.itemHeight, productData.itemHeightUnit,
        productData.packageLength, productData.packageLengthUnit,
        productData.packageWidth, productData.packageWidthUnit,
        productData.packageHeight, productData.packageHeightUnit,
        productData.countryOfOrigin,
        productData.batteriesRequired ? "Yes" : "No",
        productData.batteriesIncluded ? "Yes" : "No",
        productData.batteryCellComposition,
        productData.batteryWeight, productData.batteryWeightUnit,
        productData.numberOfBatteries,
        productData.batteryType,
        productData.numberOfLithiumIonCells,
        productData.lithiumBatteryEnergyContent, productData.lithiumBatteryEnergyContentUnit,
        productData.lithiumBatteryPackaging,
        productData.itemWeight, productData.itemWeightUnit,
        productData.hasMultipleBatteryComponents ? "Yes" : "No",
        productData.containsBatteryOrCell ? "Yes" : "No",
        productData.primarySource
      ].map(val => `"${String(val || 'N/A').replace(/"/g, '""')}"`);
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CatalogIQ_Bulk_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const performSingleResearch = async (title) => {
    const systemPrompt = `You are a world-class E-commerce Data Architect. 
    Use Google Search to find precise technical specs for "${title}". 
    If an item is not electronic, mark all battery fields as "N/A" or false.
    Ensure "genericKeywords" is a semicolon-separated string of highly relevant search terms.
    Return a strictly valid JSON object including the "primarySource" URL.`;

    const userQuery = `Search for: "${title}". 
    Provide exhaustive catalog data in this JSON format:
    {
      "itemName": "string", "productCategory": "string", "productSubcategory": "string", "recommendedBrowseNodes": "string",
      "modelName": "string", "manufacturer": "string", "bulletPoints": ["point 1", "point 2"], "genericKeywords": "string",
      "material": "string", "itemTypeName": "string", "productDescription": "one paragraph", "color": "string",
      "itemLength": "string", "itemLengthUnit": "string", "itemWidth": "string", "itemWidthUnit": "string", "itemHeight": "string", "itemHeightUnit": "string",
      "packageLength": "string", "packageLengthUnit": "string", "packageWidth": "string", "packageWidthUnit": "string", "packageHeight": "string", "packageHeightUnit": "string",
      "countryOfOrigin": "string", "batteriesRequired": boolean, "batteriesIncluded": boolean, "batteryCellComposition": "string",
      "batteryWeight": "string", "batteryWeightUnit": "string", "numberOfBatteries": "string", "batteryType": "string",
      "numberOfLithiumIonCells": "string", "lithiumBatteryEnergyContent": "string", "lithiumBatteryEnergyContentUnit": "string",
      "lithiumBatteryPackaging": "string", "itemWeight": "string", "itemWeightUnit": "string",
      "hasMultipleBatteryComponents": boolean, "containsBatteryOrCell": boolean, "primarySource": "string"
    }`;

    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      tools: [{ "google_search": {} }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('API Request Failed');

    const result = await response.json();
    const candidate = result.candidates?.[0];
    
    if (candidate && candidate.content?.parts?.[0]?.text) {
      const parsedData = JSON.parse(candidate.content.parts[0].text);
      let sources = [];
      if (candidate.groundingMetadata?.groundingAttributions) {
        sources = candidate.groundingMetadata.groundingAttributions
          .map(attr => ({ uri: attr.web?.uri, title: attr.web?.title }))
          .filter(s => s.uri);
      }
      return { ...parsedData, sources };
    }
    throw new Error('No data found');
  };

  const startBulkSearch = async () => {
    const titles = productInput.split('\n').map(t => t.trim()).filter(t => t !== '');
    if (titles.length === 0) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: titles.length });

    const collectedResults = [];

    for (let i = 0; i < titles.length; i++) {
      setProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        const data = await performSingleResearch(titles[i]);
        collectedResults.push(data);
        // Update results incrementally so user sees progress
        setResults([...collectedResults]);
      } catch (err) {
        console.error(`Error fetching ${titles[i]}:`, err);
        // Still push an error placeholder so indices match
        collectedResults.push({ itemName: `Error: ${titles[i]}`, error: true });
        setResults([...collectedResults]);
      }
      // Add a small delay between requests to be safe
      await new Promise(r => setTimeout(r, 1000));
    }

    setLoading(false);
    setSelectedResultIndex(0);
  };

  const copyToClipboard = (text, id) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 2000);
  };

  const InfoRow = ({ label, value, id }) => {
    const isBool = typeof value === 'boolean';
    const displayValue = isBool ? (value ? 'Yes' : 'No') : (value || 'N/A');
    const isLink = typeof value === 'string' && value.startsWith('http');

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-100 hover:bg-slate-50 transition-all group">
        <div className="flex-1 pr-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{label}</span>
          {isLink ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold break-all hover:underline decoration-2">
              {value} ↗
            </a>
          ) : (
            <p className={`text-slate-800 font-semibold break-words ${displayValue === 'N/A' ? 'italic text-slate-300' : ''}`}>
              {displayValue}
            </p>
          )}
        </div>
        <button 
          onClick={() => copyToClipboard(displayValue, id)}
          disabled={displayValue === 'N/A'}
          className={`mt-2 sm:mt-0 px-4 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 border ${
            copyStatus[id] 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
              : displayValue === 'N/A'
                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 shadow-sm active:scale-95'
          }`}
        >
          {copyStatus[id] ? '✓ Copied' : '📄 Copy'}
        </button>
      </div>
    );
  };

  const activeProduct = results[selectedResultIndex];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans p-4 md:p-8 selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto">
        
        {}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
            Catalog<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">IQ</span>
          </h1>
          <p className="text-slate-800 text-lg font-bold max-w-xl mx-auto mb-2">
            Intelligent catalog creation for modern marketplaces.
          </p>
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-400 text-sm font-medium">
              Developed by CG and Powered by Gemini 3 Flash and Google Search.
            </p>
          </div>
        </header>

        {}
        <div className="relative mb-6 bg-white p-3 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col transition-all focus-within:ring-4 focus-within:ring-indigo-100/50">
          <div className="flex-1 flex items-start px-5 pt-2">
            <span className="text-2xl mr-4 mt-2 opacity-40">🔎</span>
            <textarea
              className="w-full bg-transparent py-2 text-lg md:text-xl outline-none placeholder:text-slate-300 font-semibold resize-none min-h-[50px] max-h-[300px]"
              placeholder="Paste one or more product titles (one per line)..."
              rows={productInput.split('\n').length || 1}
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center px-4 py-2 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {productInput.split('\n').filter(t => t.trim()).length} Product(s) Detected
            </p>
            <button
              onClick={startBulkSearch}
              disabled={loading || !productInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-4 px-12 rounded-3xl disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing {progress.current}/{progress.total}</span>
                </>
              ) : 'Generate Info'}
            </button>
          </div>
        </div>

        {}
        {results.length > 1 && !loading && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {results.map((res, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedResultIndex(idx)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap text-xs font-black transition-all border ${
                  selectedResultIndex === idx 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {res.error ? `❌ Error: ${idx + 1}` : res.modelName || res.itemName || `Product ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 text-rose-700 rounded-3xl font-bold flex gap-3">
            <span>⚠️</span> {error}
          </div>
        )}

        {}
        {activeProduct ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-xs font-black rounded-2xl transition-all ${
                      activeTab === cat.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 px-2">
                <button onClick={handleReset} className="px-4 py-2 bg-white border text-xs font-black rounded-xl hover:bg-slate-50 flex items-center gap-2">🔄 Reset</button>
                <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100">📥 Export CSV ({results.length})</button>
              </div>
            </div>

            <div className="p-6 md:p-12">
              {activeProduct.error ? (
                <div className="text-center py-20">
                  <span className="text-6xl mb-4 block">🚫</span>
                  <h3 className="text-xl font-black text-slate-800">Failed to research this item.</h3>
                  <p className="text-slate-400">The title might be too vague or the information is restricted.</p>
                </div>
              ) : (
                <>
                  {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 animate-in fade-in slide-in-from-bottom-2">
                      <InfoRow id="source" label="Primary Source Link" value={activeProduct.primarySource} />
                      <InfoRow id="itemName" label="Item Name" value={activeProduct.itemName} />
                      <InfoRow id="cat" label="Product Category" value={activeProduct.productCategory} />
                      <InfoRow id="subcat" label="Product Subcategory" value={activeProduct.productSubcategory} />
                      <InfoRow id="model" label="Model Name" value={activeProduct.modelName} />
                      <InfoRow id="manu" label="Manufacturer" value={activeProduct.manufacturer} />
                      <InfoRow id="mat" label="Material" value={activeProduct.material} />
                      <InfoRow id="type" label="Item Type Name" value={activeProduct.itemTypeName} />
                      <InfoRow id="color" label="Color" value={activeProduct.color} />
                      <InfoRow id="coo" label="Country of Origin" value={activeProduct.countryOfOrigin} />
                    </div>
                  )}

                  {activeTab === 'marketing' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <InfoRow id="desc" label="Product Description" value={activeProduct.productDescription} />
                      <InfoRow id="nodes" label="Recommended Browse Nodes" value={activeProduct.recommendedBrowseNodes} />
                      <InfoRow id="keyword" label="Generic Keywords" value={activeProduct.genericKeywords} />
                      <div className="mt-4 border-t pt-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-4 ml-4">Bullet Points</h3>
                        {activeProduct.bulletPoints?.map((bp, i) => (
                          <InfoRow key={i} id={`bp${i}`} label={`Bullet Point ${i+1}`} value={bp} />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'physical' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="p-6 bg-slate-50 rounded-3xl">
                        <h4 className="font-black text-xs uppercase text-slate-400 mb-4">Item Specs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoRow id="il" label="Item Length" value={activeProduct.itemLength} />
                          <InfoRow id="ilu" label="Length Unit" value={activeProduct.itemLengthUnit} />
                          <InfoRow id="iw" label="Item Width" value={activeProduct.itemWidth} />
                          <InfoRow id="iwu" label="Width Unit" value={activeProduct.itemWidthUnit} />
                          <InfoRow id="ih" label="Item Height" value={activeProduct.itemHeight} />
                          <InfoRow id="ihu" label="Height Unit" value={activeProduct.itemHeightUnit} />
                          <InfoRow id="iwt" label="Item Weight" value={activeProduct.itemWeight} />
                          <InfoRow id="iwtu" label="Weight Unit" value={activeProduct.itemWeightUnit} />
                        </div>
                      </div>
                      <div className="p-6 bg-indigo-50/30 rounded-3xl">
                        <h4 className="font-black text-xs uppercase text-slate-400 mb-4">Package Specs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoRow id="pl" label="Item Package Length" value={activeProduct.packageLength} />
                          <InfoRow id="plu" label="Package Length Unit" value={activeProduct.packageLengthUnit} />
                          <InfoRow id="pw" label="Item Package Width" value={activeProduct.packageWidth} />
                          <InfoRow id="pwu" label="Package Width Unit" value={activeProduct.packageWidthUnit} />
                          <InfoRow id="ph" label="Item Package Height" value={activeProduct.packageHeight} />
                          <InfoRow id="phu" label="Package Height Unit" value={activeProduct.packageHeightUnit} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'battery' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 animate-in fade-in slide-in-from-bottom-2">
                      <InfoRow id="br" label="Are batteries required?" value={activeProduct.batteriesRequired} />
                      <InfoRow id="bi" label="Are batteries included?" value={activeProduct.batteriesIncluded} />
                      <InfoRow id="bc" label="Battery Cell Composition" value={activeProduct.batteryCellComposition} />
                      <InfoRow id="bw" label="Battery Weight" value={activeProduct.batteryWeight} />
                      <InfoRow id="bt" label="Battery Type" value={activeProduct.batteryType} />
                      <InfoRow id="li" label="Lithium-ion Cells" value={activeProduct.numberOfLithiumIonCells} />
                      <InfoRow id="ec" label="Energy Content" value={activeProduct.lithiumBatteryEnergyContent} />
                      <InfoRow id="hm" label="Has Multiple Components" value={activeProduct.hasMultipleBatteryComponents} />
                      <InfoRow id="cb" label="Contains Battery/Cell" value={activeProduct.containsBatteryOrCell} />
                    </div>
                  )}

                  {activeTab === 'source' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      {activeProduct.sources?.map((s, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                          <div className="overflow-hidden mr-4">
                            <p className="font-bold text-slate-800 truncate">{s.title || 'Web Result'}</p>
                            <a href={s.uri} target="_blank" className="text-xs text-indigo-600 truncate block max-w-md">{s.uri}</a>
                          </div>
                          <a href={s.uri} target="_blank" className="flex-shrink-0 px-4 py-2 bg-white border text-[10px] font-black rounded-lg">VISIT ↗</a>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : !loading && (
          <div className="mt-12 py-24 bg-white rounded-[3rem] text-center shadow-xl shadow-slate-200/50 border border-white">
            <span className="text-7xl mb-4 inline-block">📋</span>
            <h2 className="text-2xl font-black text-slate-800">Ready to catalog?</h2>
            <p className="text-slate-400 font-medium">Paste one or many product titles above to begin deep AI research.</p>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-2 { from { transform: translateY(0.5rem); } to { transform: translateY(0); } }
        .animate-in { animation: fade-in 0.3s ease-out, slide-in-from-bottom-2 0.3s ease-out; }
      `}} />
    </div>
  );
};

export default App;
