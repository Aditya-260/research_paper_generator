"""
retrain.py — Retrain the Sentinel AI detection model with a proper academic dataset.

The original model was trained on casual/informal human text vs AI academic text.
This script fixes that by using ACADEMIC human text vs AI-generated academic text,
so the model can actually distinguish them correctly.

Run: python retrain.py
"""

import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import joblib
import numpy as np

# ══════════════════════════════════════════════════════════════════════════════
# DATASET
# Label 0 = Human-written academic text
# Label 1 = AI-generated academic text
#
# Human characteristics: varied sentence lengths, first-person, hedging language
#   ("appears to", "might", "we found"), direct observations, specific numbers,
#   natural flow, less formulaic.
#
# AI characteristics: uniform sentence lengths, passive voice throughout,
#   heavy transitions ("Furthermore", "Moreover", "Additionally"), formulaic
#   structure, keywords like "comprehensive", "robust", "novel", "state-of-the-art".
# ══════════════════════════════════════════════════════════════════════════════

HUMAN_SAMPLES = [

    # ── Computer Science / Machine Learning ──────────────────────────────────
    "We trained a convolutional network on 50,000 chest X-rays collected over three years. The model reached 89% sensitivity on the held-out test set. That said, performance dropped to 71% when we ran it on images from a different hospital — a gap we attribute mainly to scanner differences. We're still trying to figure out the best way to handle that.",

    "Our experiments show that adding dropout after every pooling layer helped more than we expected. The validation loss stopped oscillating around epoch 40. We also noticed that the Adam optimizer converged roughly twice as fast as SGD here, though we're not sure if that holds in general.",

    "The attention mechanism didn't improve things as much as the recent literature suggested it would. On our dataset, a simple bidirectional LSTM with CRF decoding actually outperformed the transformer by about 3 F1 points. We think the dataset size (only 8,000 sentences) might be too small for attention to shine.",

    "We compared five different tokenization strategies. Byte-pair encoding gave the best downstream performance on our NER task, though it made the vocabulary 40% larger. Character-level models were surprisingly competitive on the biomedical domain despite being slower.",

    "The clustering results were messy at first. K-means kept producing one huge cluster and two tiny ones. Switching to DBSCAN helped, but the epsilon parameter was very sensitive — values between 0.3 and 0.4 gave wildly different results on the same data.",

    "To our surprise, the smallest model (12M parameters) generalized better than the 340M one on our out-of-domain test set. We suspect the larger model memorized quirks in the training distribution. This aligns with what Gururangan et al. found in 2020, though our setting is quite different.",

    "Fine-tuning BERT on 500 labeled examples gave us 84% accuracy. That was enough for our use case. We did try to get more labels but the annotation cost was prohibitive given our timeline. Adding 50 more labels from a second annotator bumped accuracy to 87%.",

    "The inference time was a real problem. Our transformer model took 340ms per query on a CPU instance, which was way above our 100ms latency budget. Quantizing to INT8 brought it down to 140ms with only a 1.2% accuracy drop, which was acceptable.",

    "We found that data augmentation through back-translation helped mainly for low-resource languages in our experiment — for English, it added noise more than signal. This matches our intuition since the English training set was already large enough.",

    "Our reinforcement learning agent consistently got stuck in a local optimum where it learned to exploit one repeatable state sequence rather than generalizing. Adding entropy regularization helped somewhat, but the training was still much noisier than the supervised baseline.",

    "The graph neural network performed well on citation networks but struggled on heterogeneous graphs with more than 3 node types. We think the aggregation function needs to be type-aware, something we plan to tackle in follow-up work.",

    "We ran our pipeline on 1.2 million tweets collected between January and March. About 14% were flagged as potential misinformation by our classifier. Manual review of a 500-sample subset confirmed the precision at around 71%, which was lower than we hoped.",

    "The federated learning setup required 40 communication rounds to converge, versus 15 for centralized training. The accuracy gap between the two setups was 4.3 percentage points — more than we expected given the IID data split we used.",

    "We used SHAP values to understand what the model was paying attention to. In most cases, the top features made intuitive sense — certain drug names and symptom patterns were indeed the strongest predictors. But in about 8% of predictions, the model seemed to latch onto administrative codes that shouldn't carry clinical meaning.",

    "Our system achieved 93.2% accuracy on the standard benchmark. However, we noticed that the benchmark test set has significant overlap with commonly scraped web data, so this number is probably overly optimistic. We report results on a cleaner held-out set in Table 3.",

    # ── Biology / Medicine ───────────────────────────────────────────────────
    "The mice in the high-dose group showed a 40% reduction in tumor volume after 3 weeks. Four animals died during treatment — we believe due to toxicity, though we can't fully rule out unrelated causes. The low-dose group had a more modest 18% reduction with no fatalities.",

    "We sequenced 230 samples from patients across three clinical sites. The allele frequency distribution was surprisingly similar across sites, which gave us more confidence in pooling the data. One site showed a slight batch effect that we corrected using ComBat.",

    "The protein folding prediction matched the experimental structure with an RMSD of 1.4 Å for the core domain. The loop regions were less accurate, as expected — they're notoriously flexible and harder to predict. We validated against two independent crystal structures.",

    "Survival analysis using the Kaplan-Meier estimator showed a significant difference between the treatment and control arms (log-rank p = 0.003). However, the confidence intervals were wide after month 18 because we lost a lot of patients to follow-up.",

    "The cell proliferation assay showed dose-dependent inhibition, with an IC50 of roughly 2.3 μM. Interestingly, concentrations above 10 μM seemed to paradoxically increase proliferation in one of the three cell lines tested. We repeated this three times and got the same result each time.",

    "Our GWAS identified 7 loci reaching genome-wide significance (p < 5×10⁻⁸). Three of these replicated in the independent validation cohort. The other four were either marginal or showed opposite direction of effect in the replication dataset, so we're treating them cautiously.",

    "The immunohistochemistry results were inconsistent across different antibody lots. We ended up using three different antibody clones and taking results where at least two agreed. This kind of variability is frustrating but common in our experience.",

    "RNA-seq revealed 312 differentially expressed genes (FDR < 0.05, fold change > 2). Pathway enrichment pointed strongly toward the TGF-β pathway. What surprised us was the upregulation of several immune checkpoint genes, which we hadn't predicted from the mouse model.",

    "The CRISPR knockout efficiency varied across cell lines — we got 85-95% in HEK293 but only about 60% in primary fibroblasts. We confirmed knockout by Western blot in all cases. The phenotype was much cleaner in the high-efficiency lines, as you'd expect.",

    "Patient recruitment was slower than anticipated. We enrolled 78 of the 120 participants we had planned for. This reduced our statistical power, and some of the secondary endpoints that were marginally significant in the power calculation became underpowered. We discuss the implications in the limitations section.",

    "We detected the target metabolite in 67% of plasma samples above the assay detection limit. The remaining 33% weren't necessarily absent — many were likely below the 0.5 ng/mL threshold. Imputation using the half-minimum method didn't substantially change the associations we found.",

    "The drug crossed the blood-brain barrier in the mouse model, reaching concentrations of about 30% of plasma levels. This was encouraging. Whether this translates to humans is unclear — rodent BBB permeability often overestimates human penetration.",

    "Our meta-analysis included 14 studies with a combined sample of 8,340 participants. The pooled odds ratio was 1.43 (95% CI: 1.21–1.69). Heterogeneity was moderate (I² = 52%), which we explored through subgroup analyses without finding a clear explanation.",

    "The organoid model recapitulated the key histological features of the primary tumor in most cases. However, for 3 of 18 patient samples, the organoids failed to establish — possibly due to low tumor cellularity in the biopsy. We excluded these from the analysis.",

    "Antibiotic resistance profiles differed significantly between community and hospital isolates. The hospital strains showed resistance to carbapenems in 23% of cases compared to less than 1% in community strains. This difference wasn't fully explained by clonal spread — we saw it across multiple sequence types.",

    # ── Physics ──────────────────────────────────────────────────────────────
    "The spectroscopic measurements confirmed the expected energy transition at 532 nm. We saw a second, weaker peak around 490 nm that doesn't appear in the theoretical model — we're not sure if it's a real physical effect or an artifact of our detector.",

    "Our gravitational wave signal had a signal-to-noise ratio of 14.3, well above the detection threshold. The best-fit parameters gave component masses of 36 and 29 solar masses. The sky localization was unfortunately poor — about 900 square degrees at 90% confidence.",

    "We measured the Hall effect in our 2D material samples at temperatures from 4K to 300K. The carrier density was roughly constant, but the mobility dropped sharply above 50K — consistent with phonon-limited transport. The behavior at 4K suggested some disorder scattering we hadn't accounted for.",

    "Simulations of the plasma confinement showed instability at input powers above 2.4 MW. We tried three different shaping configurations; the elongated plasma cross-section was the most stable but only up to 2.1 MW. These numbers are about 15% lower than theoretical predictions.",

    "The neutron scattering data showed clear magnetic order below 45K. The ordering wavevector matched our prediction from density functional theory. The ordered moment was about 1.8 μB per formula unit, which is somewhat reduced from the ionic value — likely due to quantum fluctuations or hybridization effects.",

    "We fabricated 40 Josephson junction devices. About a third showed the expected behavior; the rest had resistance values that were too high, probably from contamination during deposition. The working devices showed IcRn products of roughly 0.2 mV at 4K.",

    "The optical trapping experiment let us hold single particles for up to 8 minutes before they escaped. The escape rate increased by a factor of 3 when we raised the temperature from 20°C to 40°C, roughly consistent with Arrhenius scaling.",

    "Our Monte Carlo simulations of the Ising model reproduced the known critical temperature to within 2%. The finite-size scaling analysis was consistent with the 2D Ising universality class, as expected. We did see some deviations at very small system sizes that we attribute to boundary effects.",

    "The laser linewidth was a limiting factor in our interferometry setup. We measured it at about 8 kHz, which was acceptable for most measurements but became problematic for the longer path-length configurations. A narrower laser would have been ideal but was outside our budget.",

    # ── Economics ────────────────────────────────────────────────────────────
    "We used a regression discontinuity design to estimate the effect of the minimum wage increase on employment. The discontinuity at the threshold is visible in the data, and the estimated effect was -0.8% (SE = 0.4%) — small and marginally significant. The parallel trends assumption seems plausible based on pre-period data.",

    "The instrumental variable approach gave us estimates that were much larger than OLS — a common pattern when the instrument picks up a more elastic subpopulation. We're cautious about interpreting the IV estimate as the average treatment effect for the full population.",

    "Household survey data showed consumption fell by about 12% in the year following the job loss, recovering roughly half of that over the next three years. The recovery was faster for workers who found jobs in the same industry versus those who switched.",

    "Our difference-in-differences estimate relied on counties that happened to be adjacent to the policy boundary. The control group had similar pre-trends, though we can't fully rule out that the treated counties had other differences that could confound the estimate.",

    "The auction data showed systematic overbidding relative to the risk-neutral Nash equilibrium prediction. About 60% of bids exceeded the dominant strategy threshold in the common value setting — consistent with the winner's curse but also with other behavioral explanations.",

    "We matched treated firms to control firms on size, industry, and pre-period profitability using propensity score matching. The matched sample had much better covariate balance, though we weren't able to match on some potentially important unobservables.",

    "Inflation expectations derived from the survey were persistent — people who had been surprised by higher inflation in the past tended to revise their expectations upward more than those who hadn't. This heterogeneity matters for aggregate models that assume representative agents.",

    "The labor market data showed a sharp increase in job-to-job transitions starting in mid-2021. Workers who made such transitions saw average wage gains of 8.3%, compared to 3.1% for those who stayed. This wage growth differential was larger than in any comparable period in our sample.",

    # ── Psychology ───────────────────────────────────────────────────────────
    "Participants in the sleep deprivation condition made significantly more errors on the working memory task (M = 4.2, SD = 1.8) compared to the control group (M = 2.1, SD = 1.4). The effect size was large (d = 1.3). However, several participants in the deprived group fell asleep during the task, which complicates interpretation.",

    "We recruited participants through Amazon Mechanical Turk. The sample was more educated and younger than the general population, which limits generalizability. Attention checks excluded about 18% of responses, more than we had anticipated.",

    "The cognitive reappraisal intervention reduced self-reported anxiety by about 1.5 points on the 10-point scale relative to the active control. The effect persisted at the 4-week follow-up but was smaller (0.9 points). We didn't have a longer follow-up, so we can't say whether it persisted further.",

    "The implicit association test results didn't correlate with our explicit attitude measures (r = 0.08, p = 0.34). This dissociation is common in the literature but remains puzzling. We can't tell from our data whether it reflects genuinely separate constructs or just measurement noise.",

    "Replication of the classic social priming effect was unsuccessful. Our pre-registered sample of 200 participants showed no effect (d = 0.04, 90% CI: -0.18 to 0.25). We used a procedure as close to the original as possible, though some details were underspecified in the original paper.",

    "The longitudinal data showed that conscientiousness at age 18 predicted income at 40 better than IQ did in our cohort. The effect held after controlling for parental education and childhood socioeconomic status. We're cautious about causal inference here given the many potential confounders.",

    "Eye tracking showed that participants fixated on emotional faces for about 180ms longer than neutral ones on average. The variability was high though — some participants showed no preference at all. Anxiety scores correlated positively with time spent on fearful faces (r = 0.31).",

    "The therapy outcome data came from a naturalistic setting, not a randomized trial. Clients who dropped out after fewer sessions had worse baseline scores on average, making it hard to assess whether the treatment worked or whether the apparent improvement was just regression to the mean.",

    "We found that social media use before bed was negatively associated with sleep quality (β = -0.23, p = 0.01), but this was based on self-report data collected once. We can't establish causality, and the effect size, while statistically significant, may not be clinically meaningful.",

    "The group differences in cortisol response were present in the lab but not in the ambulatory data collected a week later. We don't have a clear explanation for this discrepancy — it could be that the novelty of the lab setting amplified stress responses, or that our ambulatory protocol was too variable.",
]


AI_SAMPLES = [

    # ── Computer Science / Machine Learning ──────────────────────────────────
    "The proposed deep learning framework demonstrates superior performance across all evaluated benchmark datasets, achieving state-of-the-art results with a classification accuracy of 97.3%. Furthermore, the computational efficiency of the architecture was significantly enhanced through the implementation of novel pruning strategies. The experimental results conclusively establish the efficacy of the proposed methodology in addressing the limitations inherent in conventional approaches.",

    "In this paper, we present a comprehensive framework for natural language processing that leverages the power of transformer-based architectures. The proposed model was rigorously evaluated on multiple downstream tasks, demonstrating remarkable improvements over existing baseline methods. Moreover, the ablation study confirms that each component of the proposed architecture contributes meaningfully to the overall performance.",

    "The experimental evaluation was conducted on three widely recognized benchmark datasets to comprehensively assess the performance of the proposed approach. The results demonstrate that the proposed methodology consistently outperforms state-of-the-art methods across all evaluation metrics. Additionally, the computational complexity analysis reveals that the proposed approach achieves superior efficiency without compromising predictive accuracy.",

    "A novel attention mechanism is introduced that effectively captures long-range dependencies in sequential data. The proposed mechanism was integrated into an end-to-end trainable architecture, enabling the model to selectively attend to the most relevant features. Extensive experiments demonstrate that the incorporation of this mechanism yields substantial improvements in performance compared to conventional attention schemes.",

    "The federated learning paradigm was adopted to facilitate privacy-preserving model training across distributed data sources. The proposed aggregation strategy effectively mitigates the impact of non-IID data distributions while maintaining competitive performance. Furthermore, the communication overhead was significantly reduced through the application of gradient compression techniques, thereby enhancing the practical applicability of the proposed framework.",

    "In this study, a comprehensive evaluation of six machine learning algorithms was conducted to identify the most effective approach for the task of intrusion detection. The experimental results demonstrate that the ensemble-based method achieves the highest detection accuracy of 98.7%, outperforming all competing approaches. It is worth noting that the proposed methodology exhibits robust performance even in the presence of class imbalance.",

    "The proposed graph neural network architecture incorporates a hierarchical message-passing scheme that enables effective representation learning across multiple scales. The model was trained in an end-to-end fashion using a combination of supervised and self-supervised objectives. Extensive experimental validation on benchmark graph classification tasks confirms the superiority of the proposed approach over existing graph-based methods.",

    "This paper presents a novel reinforcement learning algorithm that addresses the exploration-exploitation dilemma through the integration of uncertainty-aware reward shaping. The proposed algorithm was evaluated in a comprehensive suite of simulated environments, demonstrating consistent convergence to near-optimal policies. Moreover, the theoretical analysis establishes the convergence guarantees of the proposed approach under standard assumptions.",

    "The transfer learning approach was employed to leverage knowledge from large-scale pre-trained models for the target domain. A systematic fine-tuning procedure was developed to effectively adapt the pre-trained representations to the specific characteristics of the target task. The experimental results demonstrate that the proposed transfer learning strategy yields substantial improvements in performance, particularly in low-resource settings.",

    "A robust anomaly detection framework is proposed that combines statistical modeling with deep representation learning. The proposed framework was extensively validated on both synthetic and real-world datasets, demonstrating superior detection performance while maintaining a low false positive rate. Furthermore, the interpretability module incorporated into the framework provides meaningful explanations for the detected anomalies.",

    "The proposed multi-modal fusion architecture effectively integrates information from heterogeneous data modalities through a cross-attention mechanism. The architecture was designed to be modality-agnostic, enabling seamless adaptation to diverse fusion scenarios. Comprehensive experimental evaluation demonstrates that the proposed fusion strategy consistently outperforms unimodal and alternative multi-modal baselines.",

    "In this work, a novel data augmentation strategy is introduced that leverages generative adversarial networks to synthesize high-quality training samples. The proposed augmentation strategy was validated through rigorous ablation studies, confirming its effectiveness in improving model generalization. Additionally, the generated samples were evaluated using standard quality metrics, demonstrating their statistical consistency with the original data distribution.",

    "The proposed knowledge distillation framework enables the efficient compression of large neural networks while preserving their predictive capabilities. The distillation process was optimized through a carefully designed objective function that balances the trade-off between model compactness and accuracy. Experimental results demonstrate that the compressed models achieve performance comparable to the original networks while requiring significantly fewer computational resources.",

    "A comprehensive survey of natural language generation techniques is presented, with particular emphasis on recent advances in neural approaches. The survey systematically categorizes existing methods according to their underlying architectures and training paradigms. Furthermore, a rigorous empirical comparison of representative methods is conducted to provide objective insights into their relative strengths and limitations.",

    "The proposed contrastive learning framework leverages self-supervised objectives to learn discriminative representations without requiring labeled data. The learned representations are evaluated through extensive downstream task evaluation, demonstrating competitive performance with supervised counterparts. Notably, the proposed framework exhibits remarkable data efficiency, achieving strong performance with as few as 1% of labeled examples.",

    # ── Biology / Medicine ───────────────────────────────────────────────────
    "The proposed therapeutic intervention demonstrated remarkable efficacy in reducing tumor volume, achieving a statistically significant reduction of 67.3% compared to the control group (p < 0.001). Furthermore, the treatment was well-tolerated, with minimal adverse effects observed across all treatment cohorts. These findings conclusively establish the clinical potential of the proposed approach for the treatment of the target malignancy.",

    "A comprehensive genomic analysis was conducted to characterize the molecular landscape of the disease, encompassing whole-genome sequencing of 500 patient samples. The analysis revealed a distinctive mutational signature that was consistently present across patient subgroups. Moreover, pathway enrichment analysis identified several novel therapeutic targets that may be exploited for the development of more effective interventions.",

    "The novel biomarker demonstrated exceptional diagnostic accuracy, achieving an area under the receiver operating characteristic curve of 0.94 in the validation cohort. Furthermore, the biomarker exhibited superior sensitivity and specificity compared to existing clinical markers. It is worth noting that the biomarker retained its predictive value across diverse demographic subgroups, suggesting broad clinical applicability.",

    "The CRISPR-Cas9 gene editing approach was employed to introduce targeted modifications in the genome of the model organism, enabling precise interrogation of gene function. The editing efficiency was rigorously validated through comprehensive sequencing analysis. The resulting phenotypic characterization revealed novel insights into the functional role of the target gene in the regulatory network governing disease progression.",

    "In this study, a comprehensive meta-analysis was conducted to synthesize evidence from 28 randomized controlled trials evaluating the efficacy of the intervention. The pooled analysis demonstrated a clinically meaningful and statistically significant benefit across all primary endpoints. Furthermore, subgroup analyses revealed consistent effects across different patient populations and treatment settings.",

    "The proteomic profiling identified 847 differentially expressed proteins in the disease state compared to healthy controls. Functional enrichment analysis revealed significant overrepresentation of pathways associated with inflammatory response and cellular metabolism. Notably, several of the identified proteins represent promising candidates for therapeutic targeting, warranting further investigation.",

    "The single-cell RNA sequencing analysis revealed previously uncharacterized cellular heterogeneity within the tumor microenvironment. The analysis identified distinct cell populations exhibiting unique transcriptional signatures associated with disease progression. Furthermore, the spatial distribution of these populations was systematically characterized, providing novel insights into the architectural organization of the tumor.",

    "The proposed drug delivery system demonstrated enhanced targeting efficiency and reduced systemic toxicity compared to conventional formulations. In vitro and in vivo validation studies confirmed the superior performance of the nanoparticle-based delivery platform across multiple cancer cell lines. Moreover, pharmacokinetic analysis revealed favorable absorption, distribution, metabolism, and excretion properties.",

    "A systematic review of clinical outcomes associated with the novel surgical technique revealed significant improvements in postoperative recovery and long-term functional outcomes. The analysis encompassed data from 15 institutions, ensuring the generalizability of the findings. Additionally, complication rates were substantially lower in patients who underwent the novel procedure compared to those receiving conventional treatment.",

    "The longitudinal cohort study investigated the association between dietary patterns and the risk of developing the target condition over a 10-year follow-up period. Multivariate Cox proportional hazards regression analysis revealed a significant inverse association between adherence to a specific dietary pattern and disease incidence. Furthermore, the dose-response relationship was carefully characterized to identify threshold effects.",

    # ── Physics ──────────────────────────────────────────────────────────────
    "The experimental investigation demonstrated the successful observation of the predicted quantum phenomenon in a controlled laboratory setting. The measured values were in excellent agreement with theoretical predictions, with deviations not exceeding 0.3%. Furthermore, the experimental setup was optimized to minimize systematic uncertainties, ensuring the reliability and reproducibility of the reported measurements.",

    "A comprehensive theoretical framework is developed that rigorously describes the dynamics of the physical system under consideration. The framework incorporates novel mathematical tools that enable the derivation of closed-form analytical solutions for previously intractable problems. The theoretical predictions were validated through extensive numerical simulations and comparison with available experimental data.",

    "The novel material exhibits exceptional physical properties that render it highly suitable for applications in quantum computing and advanced sensing technologies. Comprehensive characterization studies reveal remarkable stability under operational conditions, with performance metrics surpassing those of previously reported materials. Furthermore, the synthesis procedure was optimized to enable scalable production while maintaining material quality.",

    "The computational study employed ab initio methods to investigate the electronic structure and associated properties of the compound of interest. The calculations were performed using a high-performance computing cluster to achieve the required level of accuracy. The results provide fundamental insights into the structure-property relationships governing the observed physical behavior.",

    # ── Economics ────────────────────────────────────────────────────────────
    "The empirical analysis employs a comprehensive panel dataset spanning 30 years and encompassing 45 countries to rigorously examine the relationship between institutional quality and economic growth. The econometric methodology incorporates instrumental variable estimation to address potential endogeneity concerns. The results demonstrate a robust positive association that persists across alternative specifications and robustness checks.",

    "This paper presents a novel theoretical framework that integrates behavioral economic principles with traditional neoclassical models to provide a more complete characterization of household financial decision-making. The model generates testable predictions that are empirically validated using a large-scale representative household survey. Furthermore, the policy implications of the theoretical framework are systematically explored.",

    "The causal identification strategy exploits exogenous variation in policy exposure generated by a natural experiment to estimate the causal effect of the intervention on economic outcomes. The validity of the identification assumption is carefully assessed through a battery of diagnostic tests. The estimated effects are both statistically significant and economically meaningful, with implications for policy design.",

    "A comprehensive analysis of labor market dynamics is conducted using administrative data covering the universe of employment spells over a 15-year period. The analysis reveals systematic patterns in job mobility and wage dynamics that are consistent with a model of employer market power. Furthermore, the findings have important implications for understanding the determinants of wage inequality.",

    "The dynamic stochastic general equilibrium model is estimated using Bayesian methods to quantify the relative importance of demand and supply shocks in driving macroeconomic fluctuations. The estimated model fits the data well and generates impulse response functions consistent with empirical estimates from structural vector autoregressions. Moreover, the counterfactual analysis reveals the significant role of monetary policy in stabilizing output and inflation.",

    # ── Psychology ───────────────────────────────────────────────────────────
    "The present study employed a randomized controlled experimental design to rigorously investigate the causal relationship between mindfulness-based intervention and psychological well-being. The intervention demonstrated statistically significant improvements across all measured outcomes, with effect sizes in the medium-to-large range. Furthermore, the therapeutic gains were maintained at the 6-month follow-up assessment.",

    "A comprehensive meta-analysis of 67 empirical studies was conducted to synthesize the evidence regarding the efficacy of cognitive behavioral therapy for anxiety disorders. The pooled analysis revealed a large and statistically significant effect (Hedges' g = 0.89), with minimal evidence of publication bias as assessed through funnel plot asymmetry and Egger's test. Moreover, the treatment effects were consistent across diverse clinical populations.",

    "The neuroimaging investigation revealed significant activation differences in the prefrontal cortex and amygdala during the emotional regulation task, consistent with the proposed theoretical model. Furthermore, functional connectivity analysis demonstrated altered coupling between these regions in the clinical population. These findings provide novel neurobiological insights into the mechanisms underlying the observed behavioral deficits.",

    "The longitudinal study tracked 1,200 participants over a 5-year period to examine the developmental trajectory of executive function and its relationship to academic achievement. Growth curve modeling revealed significant individual differences in developmental trajectories, which were systematically associated with environmental and genetic factors. Notably, early interventions targeting executive function demonstrated lasting benefits on academic outcomes.",

    "The cross-cultural investigation examined the generalizability of established psychological phenomena across 12 culturally diverse societies. The findings reveal both universal and culture-specific patterns, with notable variations in the magnitude of the observed effects across cultural contexts. These results underscore the importance of considering cultural factors in the development of psychological theories and therapeutic interventions.",

    "A novel cognitive training paradigm was developed and validated through a systematic series of experimental studies. The training protocol demonstrated significant improvements in targeted cognitive abilities, with transfer effects observed across related but untrained domains. Furthermore, neuroimaging evidence suggests that the observed behavioral improvements are accompanied by corresponding changes in neural efficiency.",

    "The psychometric evaluation of the newly developed assessment instrument demonstrated excellent reliability and validity properties across diverse populations. Confirmatory factor analysis supported the theoretically proposed factor structure, and the instrument demonstrated strong convergent and discriminant validity with established measures. Additionally, measurement invariance was confirmed across demographic subgroups, ensuring the appropriateness of cross-group comparisons.",

    "The experimental paradigm successfully induced the target psychological state, as confirmed through multiple manipulation check measures. The subsequent behavioral assessment revealed significant differences between experimental conditions, consistent with the hypothesized mechanism. Moreover, the mediation analysis confirmed that the proposed psychological mechanism accounts for the observed relationship between the independent and dependent variables.",
]

# ══════════════════════════════════════════════════════════════════════════════
# Build DataFrame
# ══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("SENTINEL AI — MODEL RETRAINING")
print("=" * 60)

human_data = [{"text": t, "label": 0} for t in HUMAN_SAMPLES]
ai_data    = [{"text": t, "label": 1} for t in AI_SAMPLES]

df = pd.DataFrame(human_data + ai_data).sample(frac=1, random_state=42).reset_index(drop=True)

print(f"\n📊 Dataset summary:")
print(f"   Human samples : {len(human_data)}")
print(f"   AI samples    : {len(ai_data)}")
print(f"   Total         : {len(df)}")

X = df["text"]
y = df["label"]

# ══════════════════════════════════════════════════════════════════════════════
# Train / test split — stratified
# ══════════════════════════════════════════════════════════════════════════════

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n📐 Split: {len(X_train)} train / {len(X_test)} test")

# ══════════════════════════════════════════════════════════════════════════════
# Model: TF-IDF + Logistic Regression
# Better hyperparameters than original:
#   - larger ngram range (1,3) to catch phrase patterns like "it is worth noting"
#   - sublinear TF scaling to down-weight very frequent terms
#   - C tuned for generalization
# ══════════════════════════════════════════════════════════════════════════════

model = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=10000,
        ngram_range=(1, 3),       # catch bigrams AND trigrams (AI phrase patterns)
        sublinear_tf=True,        # log-scale TF to reduce dominance of frequent words
        min_df=1,
        strip_accents="unicode",
        analyzer="word",
    )),
    ("clf", LogisticRegression(
        C=0.5,                    # stronger regularization → better generalization
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
    )),
])

# ── Cross-validation first ──────────────────────────────────────────────────
print("\n🔁 Running 5-fold cross-validation...")
cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
print(f"   CV accuracy: {cv_scores.mean():.1%} ± {cv_scores.std():.1%}")
print(f"   Fold scores: {[f'{s:.1%}' for s in cv_scores]}")

# ── Final training on full train split ─────────────────────────────────────
model.fit(X_train, y_train)

# ── Evaluation ─────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
test_accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Test accuracy : {test_accuracy:.1%}")
print("\n📋 Classification report:")
print(classification_report(y_test, y_pred, target_names=["Human", "AI"]))

# ══════════════════════════════════════════════════════════════════════════════
# Sanity checks — test on known examples
# ══════════════════════════════════════════════════════════════════════════════

SANITY_CHECKS = [
    # Should be HUMAN
    ("We ran the experiment three times and got similar results. The variance was higher than expected, which we attribute to equipment calibration drift between sessions.", "Human"),
    ("The sample size was smaller than we initially planned due to recruitment difficulties. This limits the statistical power of some secondary analyses.", "Human"),
    ("The correlation between the two variables was weak but statistically significant (r = 0.18, p = 0.04). We're not sure how meaningful this is practically.", "Human"),
    ("Heart disease is the leading cause of death globally, accounting for approximately 31% of all deaths. Early detection of heart disease through machine learning methods can significantly improve patient outcomes. Several studies have investigated the use of classification algorithms for this purpose.", "Human"),  # Real paper intro style

    # Should be AI
    ("Furthermore, the proposed methodology demonstrates superior performance across all evaluated metrics. The comprehensive experimental evaluation conclusively establishes the efficacy of the novel approach. It is worth noting that the results are consistent across diverse benchmark datasets.", "AI"),
    ("The novel framework was rigorously validated through extensive experimentation, demonstrating remarkable improvements over state-of-the-art baseline methods. Additionally, the theoretical analysis provides convergence guarantees under standard assumptions. Notably, the proposed approach exhibits robust performance even in challenging scenarios.", "AI"),
    ("In this paper, we present a comprehensive survey of existing approaches and propose a novel methodology that addresses the key limitations. The experimental results demonstrate statistically significant improvements across multiple evaluation benchmarks. Moreover, the ablation study confirms the contribution of each component to the overall performance.", "AI"),
]

print("\n🧪 Sanity checks:")
print("-" * 60)
for text, expected in SANITY_CHECKS:
    pred_label = "AI" if model.predict([text])[0] == 1 else "Human"
    proba = model.predict_proba([text])[0]
    confidence = round(float(max(proba)) * 100, 1)
    status = "✅" if pred_label == expected else "❌"
    print(f"{status} Expected: {expected:6s} | Got: {pred_label:6s} ({confidence}%) | {text[:70]}...")

# ══════════════════════════════════════════════════════════════════════════════
# Save model
# ══════════════════════════════════════════════════════════════════════════════

joblib.dump(model, "sentinel_model.pkl")
print(f"\n💾 Model saved → sentinel_model.pkl")
print(f"   File size: {__import__('os').path.getsize('sentinel_model.pkl') / 1024:.1f} KB")
print("\n🚀 Uvicorn will auto-reload. Detection is now calibrated for academic papers.")
print("=" * 60)
