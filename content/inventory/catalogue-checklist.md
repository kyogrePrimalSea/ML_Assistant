# Catalogue checklist (T002)

Every name in spec section 6 (from "scikit-learn: linear models" through "SciPy") mapped to the inventory ids in `catalogue.yaml` that cover it. "Supporting cast" and "Later waves" are excluded.

## scikit-learn: linear models

**Ordinary**

- [x] LinearRegression -> `sklearn.linear_model.LinearRegression`

**Regularised**

- [x] Ridge -> `sklearn.linear_model.Ridge`
- [x] RidgeCV -> `sklearn.linear_model.RidgeCV`
- [x] Lasso -> `sklearn.linear_model.Lasso`
- [x] LassoCV -> `sklearn.linear_model.LassoCV`
- [x] ElasticNet -> `sklearn.linear_model.ElasticNet`
- [x] ElasticNetCV -> `sklearn.linear_model.ElasticNetCV`
- [x] Lars -> `sklearn.linear_model.Lars`
- [x] LassoLars -> `sklearn.linear_model.LassoLars`
- [x] OrthogonalMatchingPursuit -> `sklearn.linear_model.OrthogonalMatchingPursuit`

**Bayesian**

- [x] BayesianRidge -> `sklearn.linear_model.BayesianRidge`
- [x] ARDRegression -> `sklearn.linear_model.ARDRegression`

**Robust to outliers**

- [x] HuberRegressor -> `sklearn.linear_model.HuberRegressor`
- [x] RANSACRegressor -> `sklearn.linear_model.RANSACRegressor`
- [x] TheilSenRegressor -> `sklearn.linear_model.TheilSenRegressor`

**Quantile**

- [x] QuantileRegressor -> `sklearn.linear_model.QuantileRegressor`

**Generalised (GLM)**

- [x] PoissonRegressor -> `sklearn.linear_model.PoissonRegressor`
- [x] GammaRegressor -> `sklearn.linear_model.GammaRegressor`
- [x] TweedieRegressor -> `sklearn.linear_model.TweedieRegressor`

**Online / large data**

- [x] SGDRegressor -> `sklearn.linear_model.SGDRegressor`
- [x] PassiveAggressiveRegressor -> `sklearn.linear_model.PassiveAggressiveRegressor`

**Classification**

- [x] LogisticRegression -> `sklearn.linear_model.LogisticRegression`
- [x] LogisticRegressionCV -> `sklearn.linear_model.LogisticRegressionCV`
- [x] RidgeClassifier -> `sklearn.linear_model.RidgeClassifier`
- [x] SGDClassifier -> `sklearn.linear_model.SGDClassifier`
- [x] Perceptron -> `sklearn.linear_model.Perceptron`

## scikit-learn: other regressors and classifiers

**Kernel**

- [x] KernelRidge -> `sklearn.kernel_ridge.KernelRidge`
- [x] SVR -> `sklearn.svm.SVR`
- [x] LinearSVR -> `sklearn.svm.LinearSVR`
- [x] NuSVR -> `sklearn.svm.NuSVR`
- [x] SVC -> `sklearn.svm.SVC`
- [x] LinearSVC -> `sklearn.svm.LinearSVC`

**Neighbours**

- [x] KNeighborsRegressor -> `sklearn.neighbors.KNeighborsRegressor`
- [x] KNeighborsClassifier -> `sklearn.neighbors.KNeighborsClassifier`
- [x] RadiusNeighborsRegressor -> `sklearn.neighbors.RadiusNeighborsRegressor`

**Gaussian process**

- [x] GaussianProcessRegressor -> `sklearn.gaussian_process.GaussianProcessRegressor`
- [x] GaussianProcessClassifier -> `sklearn.gaussian_process.GaussianProcessClassifier`

**Latent / shape-constrained**

- [x] PLSRegression -> `sklearn.cross_decomposition.PLSRegression`
- [x] IsotonicRegression -> `sklearn.isotonic.IsotonicRegression`

**Probabilistic classifiers**

- [x] GaussianNB -> `sklearn.naive_bayes.GaussianNB`
- [x] MultinomialNB -> `sklearn.naive_bayes.MultinomialNB`
- [x] BernoulliNB -> `sklearn.naive_bayes.BernoulliNB`
- [x] ComplementNB -> `sklearn.naive_bayes.ComplementNB`
- [x] CategoricalNB -> `sklearn.naive_bayes.CategoricalNB`
- [x] LinearDiscriminantAnalysis -> `sklearn.discriminant_analysis.LinearDiscriminantAnalysis`
- [x] QuadraticDiscriminantAnalysis -> `sklearn.discriminant_analysis.QuadraticDiscriminantAnalysis`

## Trees and ensembles

**Single tree**

- [x] DecisionTreeRegressor -> `sklearn.tree.DecisionTreeRegressor`
- [x] DecisionTreeClassifier -> `sklearn.tree.DecisionTreeClassifier`
- [x] ExtraTreeRegressor -> `sklearn.tree.ExtraTreeRegressor`

**Bagging**

- [x] RandomForest -> `sklearn.ensemble.RandomForestRegressor`, `sklearn.ensemble.RandomForestClassifier`
- [x] ExtraTrees -> `sklearn.ensemble.ExtraTreesRegressor`, `sklearn.ensemble.ExtraTreesClassifier`
- [x] BaggingRegressor/Classifier -> `sklearn.ensemble.BaggingRegressor`, `sklearn.ensemble.BaggingClassifier`

**Boosting (scikit-learn)**

- [x] GradientBoosting -> `sklearn.ensemble.GradientBoostingRegressor`, `sklearn.ensemble.GradientBoostingClassifier`
- [x] HistGradientBoosting -> `sklearn.ensemble.HistGradientBoostingRegressor`, `sklearn.ensemble.HistGradientBoostingClassifier`
- [x] AdaBoost -> `sklearn.ensemble.AdaBoostRegressor`, `sklearn.ensemble.AdaBoostClassifier`

**Boosting (XGBoost)**

- [x] XGBRegressor -> `xgboost.XGBRegressor`
- [x] XGBClassifier -> `xgboost.XGBClassifier`

**Boosting (LightGBM)**

- [x] LGBMRegressor -> `lightgbm.LGBMRegressor`
- [x] LGBMClassifier -> `lightgbm.LGBMClassifier`

**Combining models**

- [x] VotingRegressor/Classifier -> `sklearn.ensemble.VotingRegressor`, `sklearn.ensemble.VotingClassifier`
- [x] StackingRegressor/Classifier -> `sklearn.ensemble.StackingRegressor`, `sklearn.ensemble.StackingClassifier`

## scikit-learn: neural nets

**(unlabelled)**

- [x] MLPRegressor -> `sklearn.neural_network.MLPRegressor`
- [x] MLPClassifier -> `sklearn.neural_network.MLPClassifier`

## statsmodels: regression (inference-first)

**Linear**

- [x] OLS -> `statsmodels.regression.linear_model.OLS`
- [x] WLS -> `statsmodels.regression.linear_model.WLS`
- [x] GLS -> `statsmodels.regression.linear_model.GLS`

**Generalised**

- [x] GLM (Gaussian, Poisson, Binomial, Gamma, Tweedie, NegativeBinomial families) -> `statsmodels.genmod.generalized_linear_model.GLM`, `statsmodels.genmod.families.family.Gaussian`, `statsmodels.genmod.families.family.Poisson`, `statsmodels.genmod.families.family.Binomial`, `statsmodels.genmod.families.family.Gamma`, `statsmodels.genmod.families.family.Tweedie`, `statsmodels.genmod.families.family.NegativeBinomial`

**Discrete outcomes**

- [x] Logit -> `statsmodels.discrete.discrete_model.Logit`
- [x] Probit -> `statsmodels.discrete.discrete_model.Probit`
- [x] MNLogit -> `statsmodels.discrete.discrete_model.MNLogit`
- [x] Poisson -> `statsmodels.discrete.discrete_model.Poisson`
- [x] NegativeBinomial -> `statsmodels.discrete.discrete_model.NegativeBinomial`

**Robust / quantile**

- [x] RLM -> `statsmodels.robust.robust_linear_model.RLM`
- [x] QuantReg -> `statsmodels.regression.quantile_regression.QuantReg`

**Grouped data**

- [x] MixedLM -> `statsmodels.regression.mixed_linear_model.MixedLM`

**Diagnostics**

- [x] residual normality -> `statsmodels.stats.stattools.jarque_bera`, `statsmodels.stats.stattools.omni_normtest`
- [x] heteroscedasticity (Breusch-Pagan) -> `statsmodels.stats.diagnostic.het_breuschpagan`
- [x] multicollinearity (VIF) -> `statsmodels.stats.outliers_influence.variance_inflation_factor`
- [x] influence -> `statsmodels.stats.outliers_influence.OLSInfluence`

## statsmodels: time series

**Decomposition and seasonality**

- [x] seasonal_decompose -> `statsmodels.tsa.seasonal.seasonal_decompose`
- [x] STL -> `statsmodels.tsa.seasonal.STL`
- [x] MSTL -> `statsmodels.tsa.seasonal.MSTL`

**Stationarity checks**

- [x] ADF -> `statsmodels.tsa.stattools.adfuller`
- [x] KPSS -> `statsmodels.tsa.stattools.kpss`
- [x] ACF/PACF plots -> `statsmodels.graphics.tsaplots.plot_acf`, `statsmodels.graphics.tsaplots.plot_pacf`
- [x] Ljung-Box -> `statsmodels.stats.diagnostic.acorr_ljungbox`

**Autoregressive**

- [x] AutoReg -> `statsmodels.tsa.ar_model.AutoReg`
- [x] ARIMA -> `statsmodels.tsa.arima.model.ARIMA`
- [x] SARIMAX -> `statsmodels.tsa.statespace.sarimax.SARIMAX`

**Smoothing**

- [x] ExponentialSmoothing (Holt-Winters) -> `statsmodels.tsa.holtwinters.ExponentialSmoothing`
- [x] ETSModel -> `statsmodels.tsa.exponential_smoothing.ets.ETSModel`
- [x] ThetaModel -> `statsmodels.tsa.forecasting.theta.ThetaModel`

**Multivariate**

- [x] VAR -> `statsmodels.tsa.vector_ar.var_model.VAR`
- [x] VARMAX -> `statsmodels.tsa.statespace.varmax.VARMAX`

**State space / regime**

- [x] UnobservedComponents -> `statsmodels.tsa.statespace.structural.UnobservedComponents`
- [x] MarkovRegression -> `statsmodels.tsa.regime_switching.markov_regression.MarkovRegression`

## SciPy

**Quick fits**

- [x] stats.linregress -> `scipy.stats.linregress`
- [x] stats.theilslopes -> `scipy.stats.theilslopes`

**Custom curves**

- [x] optimize.curve_fit -> `scipy.optimize.curve_fit`
- [x] optimize.least_squares -> `scipy.optimize.least_squares`

**Seasonality detection**

- [x] signal.periodogram -> `scipy.signal.periodogram`

**Assumption tests**

- [x] Shapiro-Wilk -> `scipy.stats.shapiro`
- [x] normality tests -> `scipy.stats.normaltest`
- [x] t-tests -> `scipy.stats.ttest_ind`, `scipy.stats.ttest_rel`, `scipy.stats.ttest_1samp`

## Footer: checks run 2026-10-24

- 104 catalogue names mapped to 122 inventory entries; every entry is covered by at least one name, and every name by at least one entry.
- Import check: every `import_path` imported and resolved in `.venv` (scikit-learn 1.9.1, statsmodels 0.15.0, SciPy 1.18.1, XGBoost 3.4.1, LightGBM 4.7.0).
- URL check: every `doc_url` fetched with HTTP 200 and the page contains the object name (XGBoost: the `#xgboost.<Class>` anchor exists on the API page).
- Judgement calls for the user: "residual normality" -> `jarque_bera` + `omni_normtest` (not named in spec); XGBoost/LightGBM Regressor+Classifier combined on one page (proposed); statsmodels GLM families recorded at documented path `statsmodels.genmod.families.family.*`.
